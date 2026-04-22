import { google } from "googleapis";
import { NextRequest } from "next/server";

// This callback is only used when localhost is registered in Google Cloud Console.
// If you used the OAuth Playground flow, the new token is pasted directly on /reauth page.
function getOAuth2Client() {
  const clientId = process.env.YOUTUBE_CLIENT_ID!;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/callback`;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new Response(
      renderPage({
        heading: "❌ Authorization Denied",
        body: `<p>Google returned: <strong>${error}</strong></p><p><a href="/reauth">← Back to Re-auth guide</a></p>`,
        isError: true,
      }),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new Response(
      renderPage({
        heading: "❌ Missing Code",
        body: `<p>No authorization code found.</p><p><a href="/reauth">← Back to Re-auth guide</a></p>`,
        isError: true,
      }),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return new Response(
        renderPage({
          heading: "⚠️ No Refresh Token",
          body: `
            <p>Google did not return a refresh token. Revoke app access first:</p>
            <ol>
              <li>Go to <a href="https://myaccount.google.com/permissions" target="_blank">Google Account Permissions</a></li>
              <li>Remove access for your app</li>
              <li>Return to <a href="/reauth">re-auth guide</a> and try again</li>
            </ol>`,
          isError: true,
        }),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    return new Response(
      renderPage({
        heading: "✅ Success! New Refresh Token",
        body: buildSuccessBody(refreshToken, tokens.access_token ?? ""),
        isError: false,
      }),
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      renderPage({
        heading: "❌ Token Exchange Failed",
        body: `<pre>${msg}</pre><p><a href="/reauth">← Back to Re-auth guide</a></p>`,
        isError: true,
      }),
      { headers: { "Content-Type": "text/html" } }
    );
  }
}

function buildSuccessBody(refreshToken: string, accessToken: string) {
  return `
    <p class="sub">Copy this token into your <code>.env.local</code> file and restart the dev server.</p>
    <div class="token-block">
      <label>YOUTUBE_REFRESH_TOKEN (copy this)</label>
      <textarea readonly onclick="this.select()">${refreshToken}</textarea>
      <button onclick="navigator.clipboard.writeText(\`${refreshToken}\`).then(()=>this.textContent='✅ Copied!')">Copy Token</button>
    </div>
    ${accessToken ? `<div class="token-block secondary"><label>ACCESS_TOKEN (expires in 1h)</label><textarea readonly onclick="this.select()">${accessToken}</textarea></div>` : ""}
    <div class="steps">
      <h3>Final Steps</h3>
      <ol>
        <li>Open <code>.env.local</code> in your project root</li>
        <li>Replace the <code>YOUTUBE_REFRESH_TOKEN=...</code> line with the token above</li>
        <li>Stop and restart: <code>npm run dev</code></li>
        <li>Return to <a href="/">the home page</a> — the banner should turn green ✅</li>
      </ol>
    </div>`;
}

function renderPage({ heading, body, isError }: { heading: string; body: string; isError: boolean }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${heading}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0f0f13;color:#e4e4f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem}
    .card{background:#1a1a24;border:1px solid ${isError ? "#ff4d4d44" : "#4ade8044"};border-radius:16px;padding:2.5rem;max-width:700px;width:100%}
    h1{font-size:1.6rem;margin-bottom:1rem;color:${isError ? "#f87171" : "#4ade80"}}
    p,.sub{color:#a0a0b8;line-height:1.7;margin-bottom:.75rem}
    a{color:#818cf8}
    ol{color:#a0a0b8;padding-left:1.5rem;line-height:2}
    code,pre{background:#12121a;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:.85rem;color:#c4b5fd}
    pre{padding:1rem;overflow-x:auto;margin:.75rem 0;border-radius:8px}
    .token-block{background:#12121a;border:1px solid #2a2a3a;border-radius:12px;padding:1.25rem;margin:1.5rem 0}
    .token-block.secondary{opacity:.65}
    label{font-size:.72rem;color:#6b6b8a;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:.5rem}
    textarea{width:100%;height:76px;background:#0a0a12;border:1px solid #2a2a3a;border-radius:8px;color:#c4b5fd;font-family:monospace;font-size:.8rem;padding:.75rem;resize:none;outline:none;word-break:break-all}
    button{margin-top:.75rem;background:#4f46e5;color:#fff;border:none;border-radius:8px;padding:.5rem 1.25rem;cursor:pointer;font-size:.875rem}
    button:hover{background:#4338ca}
    .steps{background:#12121a;border-radius:12px;padding:1.25rem;margin-top:1.5rem}
    .steps h3{color:#818cf8;margin-bottom:.75rem;font-size:1rem}
  </style></head>
  <body><div class="card"><h1>${heading}</h1>${body}</div></body></html>`;
}
