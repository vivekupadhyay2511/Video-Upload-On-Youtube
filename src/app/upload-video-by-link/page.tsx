"use client";

import { FormEvent, useState } from "react";

type ProcessResponse =
  | {
    success: true;
    message: string;
    downloadUrl?: string;
    videoId?: string;
    watchUrl?: string;
    previewUrl?: string;
    title?: string;
  }
  | {
    success: false;
    message: string;
  };


export default function UploadVideoPage() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("public");
  const [scheduleDate, setScheduleDate] = useState(() => {
    const now = new Date();
    const kolkataNowMs = now.getTime() + (5.5 * 60 * 60 * 1000);
    const kolkataNow = new Date(kolkataNowMs);
    const yyyy = kolkataNow.getUTCFullYear();
    const mm = String(kolkataNow.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(kolkataNow.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleHour, setScheduleHour] = useState("12");
  const [scheduleMinute, setScheduleMinute] = useState("00");
  const [scheduleAmPm, setScheduleAmPm] = useState("PM");
  const [activeAction, setActiveAction] = useState<"download" | "upload" | null>(null);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const generateAllContentWithAi = async () => {
    if (!title) return;
    setIsAiGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: `Generate a catchy, viral YouTube title (MAX 100 characters) including 2-3 hashtags at the end, and a separate detailed description that includes a viral message and 15-20 trending YouTube hashtags at the bottom, all based on the video: "${title}".` 
        }),
      });
      const data = await response.json();
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
    } catch (error) {
      console.error("AI Generation Error:", error);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveAction("upload");
    let computedScheduleTime = "";
    if (isScheduled) {
      let h = parseInt(scheduleHour, 10);
      if (scheduleAmPm === "PM" && h !== 12) h += 12;
      if (scheduleAmPm === "AM" && h === 12) h = 0;
      computedScheduleTime = `${String(h).padStart(2, "0")}:${scheduleMinute}`;
    }

    try {
      const response = await fetch("/api/process-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl, title, description, privacyStatus, scheduleDate, scheduleTime: computedScheduleTime }),
      });
      const data = (await response.json()) as ProcessResponse;
      setResult(data);
    } catch {
      setResult({ success: false, message: "Something went wrong while sending the request." });
    } finally {
      setActiveAction(null);
    }
  };

  const handleDownload = async () => {
    setActiveAction("download");
    setResult(null);
    try {
      const response = await fetch("/api/download-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl }),
      });
      const data = (await response.json()) as ProcessResponse;
      setResult(data);
      if (data.success && data.title) {
        setTitle(data.title);
        // Automatically trigger AI generation
        // We delay it slightly to ensure state is updated or we pass it directly
        // But for consistency we'll just call it
        setIsAiGenerating(true);
        fetch("/api/ai/generate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            prompt: `Generate a catchy, viral YouTube title (MAX 100 characters) including 2-3 hashtags at the end, and a separate detailed description that includes a viral message and 15-20 trending YouTube hashtags at the bottom, all based on the video: "${data.title}".` 
          }),
        }).then(res => res.json()).then(aiData => {
          if (aiData.title) setTitle(aiData.title);
          if (aiData.description) setDescription(aiData.description);
        }).finally(() => setIsAiGenerating(false));
      }
    } catch {
      setResult({ success: false, message: "Something went wrong while sending the request." });
    } finally {
      setActiveAction(null);
    }
  };

  const isDownloaded = result?.success && "previewUrl" in result;

  return (
    <main className="page-shell">
      <section className="hero-card">
        <h1>Upload Video By Link</h1>

        {/* ── Sequential Flow ── */}
        <div className="sequential-flow">
          {/* STEP 1: DOWNLOAD */}
          <article className={`flow-panel ${!isDownloaded ? "flow-panel-primary" : ""}`}>
            <div className="download-layout">
              <div className="download-left">
                <div className="video-form">
                  <label>
                    Video link
                    <input
                      required
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=... or https://www.instagram.com/reel/..."
                      value={sourceUrl}
                      onChange={(event) => setSourceUrl(event.target.value)}
                    />
                  </label>

                  <button
                    className="primary-action"
                    disabled={!sourceUrl || activeAction !== null}
                    onClick={handleDownload}
                    type="button"
                  >
                    {activeAction === "download" ? "Downloading video…" : "Download Video"}
                  </button>
                </div>

                {result && !result.success && (
                  <div className="result-inline error-text">
                    <p className="status-msg">{result.message}</p>
                  </div>
                )}
              </div>

              {result && result.success && "previewUrl" in result && result.previewUrl && (
                <div className="download-right animate-fade-in">
                  <video className="preview-video fixed-height-preview" controls src={result.previewUrl} key={result.previewUrl} />
                  {"downloadUrl" in result && result.downloadUrl && (
                    <a href={result.downloadUrl} rel="noreferrer" target="_blank" className="download-link">
                      Download locally
                    </a>
                  )}
                </div>
              )}
            </div>
          </article>

          {/* STEP 2: UPLOAD (Only visible if downloaded) */}
          {isDownloaded && (
            <article className="flow-panel flow-panel-primary animate-fade-in">
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={generateAllContentWithAi}
                  disabled={isAiGenerating || !title}
                  className="premium-ai-btn"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
                    transition: 'all 0.3s ease',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  {isAiGenerating ? (
                    <>
                      <span className="ai-loader"></span>
                      Generating AI Magic...
                    </>
                  ) : "✨ Generate Content based on AI"}
                </button>
              </div>

              <form className="video-form" onSubmit={handleUpload}>
                <label style={{ position: 'relative' }}>
                  YouTube title (Optimized by AI)
                  <input
                    required
                    maxLength={100}
                    placeholder="My uploaded short"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                  <span className="char-count" style={{ right: '12px' }}>{title.length}/100</span>
                </label>

                <label style={{ position: 'relative' }}>
                  Description
                  <textarea
                    rows={6}
                    maxLength={5000}
                    placeholder="Optional YouTube description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>

                <label>
                  Privacy status
                  <select
                    value={privacyStatus}
                    onChange={(event) => setPrivacyStatus(event.target.value)}
                    disabled={isScheduled}
                  >
                    <option value="private">Private</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="public">Public</option>
                  </select>
                  {isScheduled && (
                    <span className="hint-text" style={{ color: "var(--accent-dark)", fontSize: "0.8rem", marginTop: "-4px" }}>
                      Scheduled videos must be set to Private.
                    </span>
                  )}
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => {
                      setIsScheduled(e.target.checked);
                      if (e.target.checked) setPrivacyStatus("private");
                    }}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  Schedule Video (Kolkata GMT+05:30)
                </label>

                {isScheduled && (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label>
                      Date
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(event) => setScheduleDate(event.target.value)}
                      />
                    </label>
                    <label>
                      Time
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select value={scheduleHour} onChange={e => setScheduleHour(e.target.value)} style={{ flex: 1 }}>
                          {["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span style={{ display: 'flex', alignItems: 'center' }}>:</span>
                        <select value={scheduleMinute} onChange={e => setScheduleMinute(e.target.value)} style={{ flex: 1 }}>
                          {["00", "10", "20", "30", "40", "50", "60"].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select value={scheduleAmPm} onChange={e => setScheduleAmPm(e.target.value)} style={{ flex: 1 }}>
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </label>
                  </div>
                )}

                <button disabled={activeAction !== null} type="submit" className="upload-btn">
                  {activeAction === "upload"
                    ? "Uploading to YouTube…"
                    : "Upload to YouTube Now"}
                </button>
              </form>

              {result && "watchUrl" in result && result.watchUrl && (
                <div className="success-banner">
                  <p>✅ Success! Your video is uploaded.</p>
                  <a href={result.watchUrl} rel="noreferrer" target="_blank">
                    View on YouTube →
                  </a>
                </div>
              )}
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
