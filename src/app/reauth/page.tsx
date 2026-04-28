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
        <h1 className="reauth-title">Update Refresh Token</h1>
        <p className="reauth-intro" style={{ marginBottom: "20px" }}>
          Generate a new token using Google&apos;s OAuth Playground to restore upload access.
        </p>

        <div className="reauth-step" style={{ gridTemplateColumns: "1fr", padding: "20px" }}>
          <div className="step-content">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
              <a
                href="https://developers.google.com/oauthplayground"
                target="_blank"
                rel="noreferrer"
                className="secondary-btn"
                style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}
              >
                Open OAuth Playground ↗
              </a>
              <span className="step-note" style={{ margin: 0, color: 'var(--muted)' }}>Use custom credentials (⚙️ Settings):</span>
            </div>

            <div className="reauth-creds-box" style={{ margin: 0 }}>
              <div className="cred-row">
                <label>Client ID</label>
                <div className="cred-val-row">
                  <code className="cred-value">{clientId}</code>
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText(clientId)}>Copy</button>
                </div>
              </div>
              <div className="cred-row">
                <label>Client Secret</label>
                <div className="cred-val-row">
                  <code className="cred-value">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</code>
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText("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")}>Copy</button>
                </div>
              </div>
              <div className="cred-row">
                <label>Scopes</label>
                <div className="cred-val-row">
                  <code className="cred-value" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly
                  </code>
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText("https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly")}>Copy</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="reauth-step reauth-step-highlight" style={{ gridTemplateColumns: "1fr", padding: "20px", marginBottom: 0 }}>
          <div className="step-content">
            <h2 style={{ fontSize: '1.05rem', marginBottom: '12px' }}>Paste New Token</h2>
            <div className="token-input-wrapper">
              <span className="token-input-icon">🔑</span>
              <input
                type="text"
                className="token-input"
                placeholder="Paste refresh token here (1//...)"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            <button
              className="reauth-btn-primary"
              onClick={handleSaveToken}
              disabled={!token.trim() || saving}
              style={{ width: '100%', padding: '12px' }}
            >
              {saving ? "Saving…" : "Save & Verify Token"}
            </button>

            {saveResult && (
              <div className={`save-result ${saveResult.ok ? "save-ok" : "save-error"}`} style={{ marginTop: '16px' }}>
                <div className="save-result-header">
                  {saveResult.ok ? "✅" : "❌"} {saveResult.message}
                </div>

                {saveResult.ok && (saveResult as any).needsKV && (
                  <div className="manual-save-box" style={{ marginTop: '12px', padding: '12px' }}>
                    <p style={{ fontSize: '0.85rem', marginBottom: '8px' }}>Add to Vercel Settings (<code>YOUTUBE_REFRESH_TOKEN</code>):</p>
                    <div className="cred-val-row">
                      <code className="cred-value">{(saveResult as any).refreshToken}</code>
                      <button
                        className="copy-btn"
                        onClick={() => navigator.clipboard.writeText((saveResult as any).refreshToken)}
                      >
                        Copy
                      </button>
                    </div>
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
