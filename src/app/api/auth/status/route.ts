import { google } from "googleapis";

export async function GET() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  const envCheck = {
    YOUTUBE_CLIENT_ID: !!clientId,
    YOUTUBE_CLIENT_SECRET: !!clientSecret,
    YOUTUBE_REDIRECT_URI: !!redirectUri,
    YOUTUBE_REFRESH_TOKEN: !!refreshToken,
  };

  const missingVars = Object.entries(envCheck)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missingVars.length > 0) {
    return Response.json({
      ok: false,
      status: "missing_env",
      message: `Missing environment variables: ${missingVars.join(", ")}. Add them to .env.local.`,
      envCheck,
    });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Try to get a fresh access token
    const tokenResponse = await oauth2Client.getAccessToken();
    const hasToken = !!tokenResponse.token;

    // Try a lightweight YouTube API call to verify the token actually works
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const channelRes = await youtube.channels.list({
      part: ["snippet"],
      mine: true,
      maxResults: 50,
    });

    const channels = channelRes.data.items?.map(channel => ({
      id: channel.id,
      title: channel.snippet?.title,
      customUrl: channel.snippet?.customUrl,
      thumbnail: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url,
    })) || [];

    return Response.json({
      ok: true,
      status: "authenticated",
      message: "YouTube credentials are valid and working.",
      hasAccessToken: hasToken,
      channels: channels,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown authentication error";

    const isExpired =
      message.includes("invalid_grant") ||
      message.includes("Token has been expired") ||
      message.includes("token_revoked");

    return Response.json(
      {
        ok: false,
        status: isExpired ? "token_expired" : "auth_error",
        message: isExpired
          ? `Refresh token is expired or revoked. Visit /api/auth/youtube to re-authenticate.`
          : `Authentication error: ${message}`,
        detail: message,
      },
      { status: 401 }
    );
  }
}
