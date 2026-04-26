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
      <article className="hero-card animate-fade-in" style={{ marginBottom: '2rem' }}>
        <h1 className="gradient-text">Single Video Upload</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Download and optimize any video link for YouTube.</p>

        <div className="video-form">
          <label>
            Video Link
            <input
              required
              type="url"
              placeholder="Paste YouTube or Instagram link..."
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
            {activeAction === "download" ? (
              <><span className="ai-loader"></span> Downloading...</>
            ) : "🚀 Download Video"}
          </button>

          {result && !result.success && (
            <div style={{ color: '#f87171', fontSize: '0.9rem', marginTop: '1rem', background: 'rgba(248, 113, 113, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
              {result.message}
            </div>
          )}
        </div>

        {result && result.success && "previewUrl" in result && result.previewUrl && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--line)', paddingTop: '2rem' }}>
            <video 
              style={{ width: '100%', borderRadius: '12px', background: '#000', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
              controls 
              src={result.previewUrl} 
              key={result.previewUrl} 
            />
          </div>
        )}
      </article>

      {isDownloaded && (
        <article className="hero-card animate-fade-in">
          <div style={{ marginBottom: '2rem' }}>
            <button
              type="button"
              onClick={generateAllContentWithAi}
              disabled={isAiGenerating || !title}
              className="premium-ai-btn"
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
              YouTube Title
              <input
                required
                maxLength={100}
                placeholder="Optimized AI Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <span className="char-count" style={{ right: '12px' }}>{title.length}/100</span>
            </label>

            <label>
              Description
              <textarea
                rows={6}
                maxLength={5000}
                placeholder="Viral tags and description..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <label>
                Privacy Status
                <select
                  value={privacyStatus}
                  onChange={(event) => setPrivacyStatus(event.target.value)}
                  disabled={isScheduled}
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(event) => setIsScheduled(event.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--accent)' }}
                />
                Schedule Post
              </label>
            </div>

            {isScheduled && (
              <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255, 255, 255, 0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <label>
                  Date
                  <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <label style={{ flex: 1 }}>
                    Time
                    <select value={scheduleHour} onChange={(e) => setScheduleHour(e.target.value)}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                        <option key={h} value={String(h).padStart(2, '0')}>{h}</option>
                      ))}
                    </select>
                  </label>
                  <select style={{ width: '80px' }} value={scheduleMinute} onChange={(e) => setScheduleMinute(e.target.value)}>
                    {["00", "15", "30", "45"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select style={{ width: '80px' }} value={scheduleAmPm} onChange={(e) => setScheduleAmPm(e.target.value)}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            )}

            <button
              className="primary-action"
              disabled={activeAction !== null}
              type="submit"
              style={{ background: '#16a34a', width: '100%', marginTop: '1rem' }}
            >
              {activeAction === "upload" ? (
                <><span className="ai-loader"></span> Uploading...</>
              ) : "🚀 Upload to YouTube Now"}
            </button>
          </form>

          {result && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: result.success ? '#4ade80' : '#f87171' }}>
                {result.message}
              </p>
              {result.success && "watchUrl" in result && (
                <a href={result.watchUrl} target="_blank" rel="noreferrer" className="gradient-text" style={{ textDecoration: 'none', fontWeight: 700 }}>
                  View on YouTube ↗
                </a>
              )}
            </div>
          )}
        </article>
      )}
    </main>
  );
}
