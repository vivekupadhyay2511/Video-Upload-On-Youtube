import { create as createYoutubeDl } from "youtube-dl-exec";
import { mkdir, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { ZodError } from "zod";

const ytDlpBinaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const youtubeDl = createYoutubeDl(
  join(process.cwd(), "bin", ytDlpBinaryName)
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

export function improveTitle(title: string) {
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
    return "That YouTube video is currently unavailable. It may be private, deleted, or restricted.";
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

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unexpected error while processing the video.";
}
