import { kv } from "@vercel/kv";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TOKEN_KEY = "YOUTUBE_REFRESH_TOKEN";

/**
 * Gets the refresh token from the best available source:
 * 1. Vercel KV (if configured and running on Vercel)
 * 2. Environment variables (process.env)
 */
export async function getRefreshToken(): Promise<string | null> {
  // 1. Try Vercel KV if we're not local or if KV is configured
  if (process.env.KV_REST_API_URL) {
    try {
      const token = await kv.get<string>(TOKEN_KEY);
      if (token) return token;
    } catch (err) {
      console.error("[token-storage] Failed to read from KV:", err);
    }
  }

  // 2. Fallback to process.env (covers local .env.local and Vercel Dashboard env vars)
  return process.env.YOUTUBE_REFRESH_TOKEN || null;
}

/**
 * Saves the refresh token to the appropriate location:
 * 1. Vercel KV (if configured)
 * 2. .env.local (if running locally)
 */
export async function setRefreshToken(token: string): Promise<{ success: boolean; location: string }> {
  // 1. Try Vercel KV first (Production/Preview)
  if (process.env.KV_REST_API_URL) {
    try {
      await kv.set(TOKEN_KEY, token);
      return { success: true, location: "Vercel KV (Cloud)" };
    } catch (err) {
      console.error("[token-storage] Failed to write to KV:", err);
      // If KV failed, we might still want to try local write if we're dev
    }
  }

  // 2. Local development fallback - write to .env.local
  if (process.env.NODE_ENV === "development" || !process.env.VERCEL) {
    try {
      const envPath = join(process.cwd(), ".env.local");
      let envContent = "";
      try {
        envContent = await readFile(envPath, "utf-8");
      } catch {
        envContent = "";
      }

      if (envContent.includes(`${TOKEN_KEY}=`)) {
        envContent = envContent
          .split("\n")
          .map((line) =>
            line.startsWith(`${TOKEN_KEY}=`) ? `${TOKEN_KEY}=${token}` : line
          )
          .join("\n");
      } else {
        envContent = envContent.trimEnd() + `\n${TOKEN_KEY}=${token}\n`;
      }

      await writeFile(envPath, envContent, "utf-8");
      return { success: true, location: ".env.local (Local)" };
    } catch (err) {
      console.error("[token-storage] Failed to write to .env.local:", err);
    }
  }

  return { success: false, location: "none" };
}
