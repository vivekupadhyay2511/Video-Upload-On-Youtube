import { google } from "googleapis";
import { z } from "zod";
import { setRefreshToken } from "@/lib/token-storage";

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

    // Token is valid — save it using our storage utility
    const result = await setRefreshToken(refreshToken);

    if (!result.success) {
      // If we are on Vercel and KV isn't set up, we still want to tell the user
      if (process.env.VERCEL && !process.env.KV_REST_API_URL) {
        return Response.json({
          ok: true,
          isProduction: true,
          needsKV: true,
          refreshToken: refreshToken,
          message: "✅ Token verified! But Vercel Storage (KV) is not connected. Please connect KV in your dashboard or add the token manually.",
        });
      }
      
      throw new Error("Failed to save token to storage.");
    }

    return Response.json({
      ok: true,
      location: result.location,
      message: `✅ Token verified and saved to ${result.location}!`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ ok: false, message }, { status: 400 });
  }
}
