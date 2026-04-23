import { create as createYoutubeDl } from "youtube-dl-exec";
import { mkdir, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { ZodError } from "zod";

const ytDlpBinaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const youtubeDl = createYoutubeDl(
  join(
    process.cwd(),
    "node_modules",
    "youtube-dl-exec",
    "bin",
    ytDlpBinaryName,
  ),
);

const allowedHosts = new Set([
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "www.instagram.com",
  "instagram.com",
]);

export function assertSupportedUrl(sourceUrl: string) {
  const parsedUrl = new URL(sourceUrl);

  if (!allowedHosts.has(parsedUrl.hostname)) {
    throw new Error("Only YouTube and Instagram links are supported.");
  }

  const pathname = parsedUrl.pathname.toLowerCase();
  const isYoutubeLink =
    parsedUrl.hostname.includes("youtu") &&
    (pathname.startsWith("/shorts/") || pathname.startsWith("/watch") || pathname !== "/");
  const isInstagramReel =
    parsedUrl.hostname.includes("instagram") && pathname.startsWith("/reel/");

  if (!isYoutubeLink && !isInstagramReel) {
    throw new Error(
      "Please provide a YouTube Short/video URL or an Instagram Reel URL.",
    );
  }
}

export async function getVideoInfo(sourceUrl: string) {
  const info = await youtubeDl(sourceUrl, {
    dumpJson: true,
    noWarnings: true,
    noCheckCertificates: true,
  });
  return info as any;
}

export function improveTitle(title?: string) {
  if (!title) return "Untitled Video";

  // Simple "AI" improvement: Clean up, capitalize, and add hashtags
  let improved = title
    .replace(/[\[\]\(\)]/g, "") // Remove brackets/parens
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  const hashtags = [" #Viral", " #Trending", " #Shorts", " #Video"];

  for (const tag of hashtags) {
    if ((improved + tag).length <= 100) {
      improved += tag;
    } else {
      break;
    }
  }

  return improved.slice(0, 100);
}

export async function downloadSourceVideo(sourceUrl: string) {
  const info = await getVideoInfo(sourceUrl);
  const title = info.title || "Untitled Video";

  const downloadId = randomUUID();
  const downloadDir = join(process.cwd(), "storage", "downloads", downloadId);
  await mkdir(downloadDir, { recursive: true });

  const outputTemplate = join(downloadDir, "%(title).120s-%(id)s.%(ext)s");

  await youtubeDl(sourceUrl, {
    output: outputTemplate,
    noWarnings: true,
    noCheckCertificates: true,
    restrictFilenames: true,
    format: "mp4/bestvideo+bestaudio/best",
    mergeOutputFormat: "mp4",
  });

  const downloadedFiles = await readdir(downloadDir);
  const firstFile = downloadedFiles[0];
  const filePath = firstFile ? join(downloadDir, firstFile) : "";

  if (!filePath) {
    throw new Error("The downloader did not return a saved file path.");
  }

  return {
    downloadId,
    filePath,
    filename: firstFile,
    title,
  };
}

export function getErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(", ");
  }

  if (
    rawMessage.includes("This video is not available") ||
    rawMessage.includes("Video unavailable")
  ) {
    return "That YouTube video is currently unavailable. It may be private, deleted, age-restricted, region-blocked, or temporarily inaccessible. Open the link in your browser to confirm it plays from this machine, then try another public URL if needed.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const data = error.response.data;

    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "object" &&
      data.error !== null &&
      "message" in data.error &&
      typeof data.error.message === "string"
    ) {
      return data.error.message;
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "stderr" in error &&
    typeof error.stderr === "string" &&
    error.stderr.trim()
  ) {
    return error.stderr.trim();
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "stdout" in error &&
    typeof error.stdout === "string" &&
    error.stdout.trim()
  ) {
    return error.stdout.trim();
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "exitCode" in error &&
    typeof error.exitCode === "number"
  ) {
    return `Video download failed with exit code ${error.exitCode}. This usually means the source URL is unavailable, blocked, or ffmpeg is missing on the machine.`;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unexpected error while processing the video. Check the Next.js terminal log for downloader or YouTube API details.";
}