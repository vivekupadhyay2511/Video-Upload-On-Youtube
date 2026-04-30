import { google } from "googleapis";
import { createReadStream, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { z } from "zod";

import {
  assertSupportedUrl,
  downloadSourceVideo,
  getErrorMessage,
} from "@/lib/video-utils";
import { getRefreshToken } from "@/lib/token-storage";

const requestSchema = z.object({
  sourceUrl: z.string().url(),
  downloadId: z.string().optional(),
  title: z.string().trim().min(3).max(100),
  description: z.string().max(5000).optional().default(""),
  scheduleDate: z.string().optional(),
  scheduleTime: z.string().optional().default(""),
  privacyStatus: z.enum(["private", "unlisted", "public"]).default("private"),
});

/**
 * Converts a date and time string into a UTC ISO string, 
 * strictly treating the input as (GMT+05:30) Kolkata time.
 */
function getKolkataTimeISO(dateStr: string, timeStr: string): string {
  // Expected formats: dateStr: "YYYY-MM-DD", timeStr: "HH:MM" (24-hour)
  const [hours, minutes] = timeStr.split(":").map(Number);
  const [year, month, day] = dateStr.split("-").map(Number);

  if (isNaN(hours) || isNaN(minutes) || !year || !month || !day) return "";

  // 1. Create a date object in the server's local context using UTC methods
  // to avoid any server-local timezone interference.
  const targetKolkataMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  
  // 2. Hardcode the Kolkata offset: GMT +05:30
  // Since Kolkata is AHEAD of UTC, we SUBTRACT 5.5 hours to get the UTC equivalent.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const finalUtcMs = targetKolkataMs - IST_OFFSET_MS;
  
  return new Date(finalUtcMs).toISOString();
}

async function getOAuth2Client() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  const refreshToken = await getRefreshToken();

  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    const missing: string[] = [];
    if (!clientId) missing.push("YOUTUBE_CLIENT_ID");
    if (!clientSecret) missing.push("YOUTUBE_CLIENT_SECRET");
    if (!redirectUri) missing.push("YOUTUBE_REDIRECT_URI");
    if (!refreshToken) missing.push("YOUTUBE_REFRESH_TOKEN");
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        (process.env.VERCEL ? "Add them to Vercel Project Settings." : "Add them to .env.local and restart.") +
        ` Visit /api/auth/youtube to generate a fresh refresh token.`
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

async function uploadToYouTube(params: {
  filePath: string;
  title: string;
  description: string;
  privacyStatus: "private" | "unlisted" | "public";
  publishAt?: string;
}) {
  const oauth2Client = await getOAuth2Client();

  // Force a token refresh before uploading to catch expired token early
  try {
    await oauth2Client.getAccessToken();
  } catch (tokenError: unknown) {
    const msg =
      tokenError instanceof Error ? tokenError.message : String(tokenError);
    throw new Error(
      `YouTube authentication failed: ${msg}. ` +
        `Your refresh token may be expired or revoked. ` +
        `Visit /api/auth/youtube in the browser to re-authenticate and get a new refresh token.`
    );
  }

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const fileSize = statSync(params.filePath).size;
  console.log(
    `[process-video] Uploading "${params.filePath}" (${(fileSize / 1024 / 1024).toFixed(1)} MB) to YouTube...`
  );

  const response = await youtube.videos.insert(
    {
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: params.title,
          description: params.description,
          categoryId: "22", // People & Blogs
        },
        status: {
          privacyStatus: params.publishAt ? "private" : params.privacyStatus,
          publishAt: params.publishAt || undefined,
          selfDeclaredMadeForKids: true,
        },
      },
      media: {
        mimeType: "video/mp4",
        body: createReadStream(params.filePath),
      },
    },
    {
      // Increase timeout for large file uploads (10 minutes)
      timeout: 600_000,
    }
  );

  return response.data;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);
    assertSupportedUrl(parsed.sourceUrl);

    let filePath = "";
    let downloadId = parsed.downloadId;

    if (downloadId) {
      const downloadDir = join(process.cwd(), "storage", "downloads", downloadId);
      try {
        const files = await readdir(downloadDir);
        const filename = files.find(f => !f.startsWith('.'));
        if (filename) {
          filePath = join(downloadDir, filename);
          console.log(`[process-video] Using existing local file: ${filePath}`);
        }
      } catch (err) {
        console.warn(`[process-video] Local file for ${downloadId} not found, falling back to download.`);
      }
    }

    if (!filePath) {
      console.log(`[process-video] Downloading: ${parsed.sourceUrl}`);
      const downloadResult = await downloadSourceVideo(parsed.sourceUrl);
      filePath = downloadResult.filePath;
      downloadId = downloadResult.downloadId;
      console.log(`[process-video] Download complete: ${filePath}`);
    }

    let publishAt: string | undefined = undefined;
    if (parsed.scheduleTime !== "" && parsed.scheduleDate) {
      publishAt = getKolkataTimeISO(parsed.scheduleDate, parsed.scheduleTime);
    }

    const uploaded = await uploadToYouTube({
      filePath,
      title: parsed.title,
      description: parsed.description,
      privacyStatus: parsed.scheduleTime !== "" ? "private" : parsed.privacyStatus,
      publishAt,
    });

    const videoId = uploaded.id ?? undefined;
    const watchUrl = videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : undefined;

    console.log(`[process-video] Upload successful! Video ID: ${videoId}`);

    return Response.json({
      success: true,
      message: `Video "${basename(filePath)}" uploaded to YouTube successfully!`,
      videoId,
      watchUrl,
      previewUrl: `/api/downloaded-video/${downloadId}`,
    });
  } catch (error: unknown) {
    // Extract the most useful error message possible
    let message = getErrorMessage(error);

    // Surface Google API errors clearly
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: unknown }).response === "object" &&
      (error as { response?: unknown }).response !== null
    ) {
      const resp = (error as { response: { data?: unknown; status?: number } }).response;
      console.error("[process-video] Google API response error:", JSON.stringify(resp.data, null, 2));

      if (resp.status === 401 || resp.status === 403) {
        message =
          `YouTube API returned ${resp.status}. Your refresh token is expired or the YouTube Data API is not enabled. ` +
          `Visit /api/auth/youtube in your browser to re-authenticate.`;
      }
    }

    console.error("[process-video] Error:", error);

    return Response.json({ success: false, message }, { status: 400 });
  }
}
