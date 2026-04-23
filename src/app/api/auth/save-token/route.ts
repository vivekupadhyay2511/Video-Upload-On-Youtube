import { google } from "googleapis";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const schema = z.object({
  refreshToken: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refreshToken } = schema.parse(body);

    // Verify the token actually works before saving
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      const missing = [];
      if (!clientId) missing.push("YOUTUBE_CLIENT_ID");
      if (!clientSecret) missing.push("YOUTUBE_CLIENT_SECRET");
      if (!redirectUri) missing.push("YOUTUBE_REDIRECT_URI");

      return Response.json(
        { 
          ok: false, 
          message: `Missing ${missing.join(", ")} in environment variables. ` +
                   (process.env.VERCEL ? "Add them to Vercel Project Settings." : "Add them to .env.local.")
        },
        { status: 400 }
      );
    }

    // Test the new token
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    try {
      await oauth2Client.getAccessToken();
    } catch (tokenErr: unknown) {
      const msg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
      return Response.json(
        {
          ok: false,
          message: `Token verification failed: ${msg}. Make sure you copied the full refresh token.`,
        },
        { status: 400 }
      );
    }

    // Token is valid
    
    // If we are on Vercel or in Production, we can't (or shouldn't) write to .env.local
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      return Response.json({
        ok: true,
        isProduction: true,
        refreshToken: refreshToken,
        message: "✅ Token verified! Since you are on Vercel/Production, you must manually add this to your Environment Variables.",
      });
    }

    // Local Dev — update .env.local
    const envPath = join(process.cwd(), ".env.local");
    let envContent = "";

    try {
      envContent = await readFile(envPath, "utf-8");
    } catch {
      // File doesn't exist yet, start fresh
      envContent = "";
    }

    // Replace or append the YOUTUBE_REFRESH_TOKEN line
    if (envContent.includes("YOUTUBE_REFRESH_TOKEN=")) {
      envContent = envContent
        .split("\n")
        .map((line) =>
          line.startsWith("YOUTUBE_REFRESH_TOKEN=")
            ? `YOUTUBE_REFRESH_TOKEN=${refreshToken}`
            : line
        )
        .join("\n");
    } else {
      envContent = envContent.trimEnd() + `\nYOUTUBE_REFRESH_TOKEN=${refreshToken}\n`;
    }

    await writeFile(envPath, envContent, "utf-8");

    return Response.json({
      ok: true,
      isProduction: false,
      message:
        "✅ Token saved to .env.local! You must RESTART the dev server (Ctrl+C → npm run dev) for the new token to take effect.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ ok: false, message }, { status: 400 });
  }
}
