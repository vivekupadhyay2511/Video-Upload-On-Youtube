"use client";

import { useState } from "react";

export default function ReauthPage() {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSaveToken = async () => {
    if (!token.trim()) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/auth/save-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: token.trim() }),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      setSaveResult(data);
    } catch {
      setSaveResult({ ok: false, message: "Network error — could not reach the server." });
    } finally {
      setSaving(false);
    }
  };

  const clientId = "862260040022-c0i1pnsjknkgvm5tmcuaeqg8qmdbgqs7.apps.googleusercontent.com";

  return (
    <main className="reauth-shell">
      <div className="reauth-card">
        <a href="/" className="back-link">← Back to Home</a>
        <p className="reauth-eyebrow">YouTube OAuth Setup</p>
        <h1 className="reauth-title">Get a Fresh Refresh Token</h1>
        <p className="reauth-intro">
          Your current refresh token is expired or revoked. Follow the steps below to generate a
          new one using Google&apos;s OAuth Playground — no code required.
        </p>

        {/* ── Step 1 ── */}
        <div className="reauth-step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h2>Open OAuth Playground</h2>
            <p>Click the button below to open Google&apos;s OAuth 2.0 Playground in a new tab.</p>
            <a
              href="https://developers.google.com/oauthplayground"
              target="_blank"
              rel="noreferrer"
              className="reauth-btn-primary"
            >
              Open OAuth Playground →
            </a>
          </div>
        </div>

        {/* ── Step 2 ── */}
        <div className="reauth-step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h2>Configure Your Own Credentials</h2>
            <p>
              In the playground, click the <strong>⚙️ Settings (gear icon)</strong> at the top-right.
              Then check <strong>&ldquo;Use your own OAuth credentials&rdquo;</strong> and fill in:
            </p>
            <div className="reauth-creds-box">
              <div className="cred-row">
                <label>OAuth Client ID</label>
                <div className="cred-val-row">
                  <code className="cred-value">{clientId}</code>
                  <button
                    className="copy-btn"
                    onClick={() => navigator.clipboard.writeText(clientId)}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="cred-row">
                <label>OAuth Client Secret</label>
                <div className="cred-val-row">
                  <code className="cred-value">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</code>
                  <button
                    className="copy-btn"
                    onClick={() => navigator.clipboard.writeText("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")}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            <p className="step-note">Close the settings panel after filling both fields.</p>
          </div>
        </div>

        {/* ── Step 3 ── */}
        <div className="reauth-step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h2>Select YouTube Scope</h2>
            <p>
              In the <strong>Step 1</strong> panel on the left, scroll down to find{" "}
              <strong>YouTube Data API v3</strong>. Select the scope:
            </p>
            <div className="scope-tag">
              https://www.googleapis.com/auth/youtube.upload
            </div>
            <p style={{ marginTop: "10px" }}>
              Also add <code>youtube.readonly</code> if you want the channel name check to work.
            </p>
            <div className="scope-tag" style={{ marginTop: "6px" }}>
              https://www.googleapis.com/auth/youtube.readonly
            </div>
            <p style={{ marginTop: "12px" }}>Then click <strong>&ldquo;Authorize APIs&rdquo;</strong>.</p>
          </div>
        </div>

        {/* ── Step 4 ── */}
        <div className="reauth-step">
          <div className="step-number">4</div>
          <div className="step-content">
            <h2>Sign In &amp; Allow Access</h2>
            <p>
              Google will ask you to sign in with the YouTube channel you want to upload to.
              Click <strong>&ldquo;Allow&rdquo;</strong> to grant upload permission.
            </p>
            <div className="reauth-info-box">
              ⚠️ Make sure you sign in with the <strong>Google account that owns the YouTube channel</strong> you want to upload videos to.
            </div>
          </div>
        </div>

        {/* ── Step 5 ── */}
        <div className="reauth-step">
          <div className="step-number">5</div>
          <div className="step-content">
            <h2>Exchange Code for Tokens</h2>
            <p>
              Back in the playground, click <strong>&ldquo;Exchange authorization code for tokens&rdquo;</strong>.
              The <strong>Refresh token</strong> will appear on the right panel.
            </p>
          </div>
        </div>

        {/* ── Step 6 — Paste token ── */}
        <div className="reauth-step reauth-step-highlight">
          <div className="step-number">6</div>
          <div className="step-content">
            <h2>Paste Your New Refresh Token Here</h2>
            <p>
              Copy the <strong>Refresh token</strong> from OAuth Playground and paste it below.
              Click <strong>&ldquo;Save &amp; Verify&rdquo;</strong> — the app will write it to{" "}
              <code>.env.local</code> and restart the credential check automatically.
            </p>
            <textarea
              className="token-input"
              placeholder="Paste your refresh token here (starts with 1//...)"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              rows={3}
            />
            <button
              className="reauth-btn-primary"
              onClick={handleSaveToken}
              disabled={!token.trim() || saving}
            >
              {saving ? "Saving…" : "Save & Verify Token"}
            </button>

            {saveResult && (
              <div className={`save-result ${saveResult.ok ? "save-ok" : "save-error"}`}>
                <div className="save-result-header">
                  {saveResult.ok ? "✅" : "❌"} {saveResult.message}
                </div>

                {saveResult.ok && (saveResult as any).needsKV && (
                  <div className="manual-save-box">
                    <p>Copy this Refresh Token and add it to your <strong>Vercel Project Settings</strong> (as <code>YOUTUBE_REFRESH_TOKEN</code>) OR connect <strong>Vercel KV</strong> storage to automate this:</p>
                    <div className="cred-val-row">
                      <code className="cred-value">{(saveResult as any).refreshToken}</code>
                      <button
                        className="copy-btn"
                        onClick={() => navigator.clipboard.writeText((saveResult as any).refreshToken)}
                      >
                        Copy Token
                      </button>
                    </div>
                  </div>
                )}

                {saveResult.ok && !saveResult.message.includes("Vercel Storage") && (
                   <p className="step-note">The token is now stored securely in { (saveResult as any).location || 'the cloud' }.</p>
                )}

                {saveResult.ok && (
                  <div style={{ marginTop: "10px" }}>
                    <a href="/" className="back-link">Return to home →</a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
