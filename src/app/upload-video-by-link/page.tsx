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
  const [isCropping, setIsCropping] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const generateAllContentWithAi = async () => {
    if (!title) return;
    setIsAiGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: `You are a YouTube SEO expert. Based on the video title: "${title}", return ONLY a valid JSON object with two keys: "title" and "description". "title" must be a catchy, viral YouTube title (MAX 100 characters) including 2-3 hashtags. "description" must be a detailed description with a viral message and 15-20 trending hashtags. All generated hashtags MUST be strictly lowercase.` 
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
            prompt: `You are a YouTube SEO expert. Based on the video title: "${data.title}", return ONLY a valid JSON object with two keys: "title" and "description". "title" must be a catchy, viral YouTube title (MAX 100 characters) including 2-3 hashtags. "description" must be a detailed description with a viral message and 15-20 trending hashtags. All generated hashtags MUST be strictly lowercase.` 
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

  const handleCrop = async () => {
    if (!result?.previewUrl) return;
    
    const urlParts = result.previewUrl.split('/');
    const downloadId = urlParts[urlParts.length - 1]?.split('?')[0];
    
    if (!downloadId) return;

    setIsCropping(true);
    try {
      const response = await fetch("/api/crop-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadId }),
      });
      const data = await response.json();
      if (data.success) {
        setPreviewKey(prev => prev + 1);
      } else {
        alert(data.message || "Failed to crop video.");
      }
    } catch (error) {
      console.error("Crop error:", error);
      alert("An error occurred while cropping the video.");
    } finally {
      setIsCropping(false);
    }
  };

  const isDownloaded = result?.success && "previewUrl" in result;

  return (
    <main className="page-shell">
      <article className="hero-card animate-fade-in" style={{ width: '100%', maxWidth: '1200px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="gradient-text">Single Video Upload</h1>
          <p style={{ color: 'var(--muted)', marginTop: '8px' }}>Download and optimize any video link for YouTube.</p>
        </div>

        {/* Top Search Bar Style */}
        <div style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid var(--line)' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', color: 'var(--muted)' }}>🔗</span>
            <input
              required
              type="url"
              placeholder="Paste YouTube or Instagram link here..."
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px 16px 16px 52px', color: '#fff', fontSize: '1rem', transition: 'all 0.3s' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 4px var(--accent-glow)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <button
            className="primary-action"
            disabled={!sourceUrl || activeAction !== null}
            onClick={handleDownload}
            type="button"
            style={{ padding: '0 32px', borderRadius: '12px', whiteSpace: 'nowrap' }}
          >
            {activeAction === "download" ? (
              <><span className="ai-loader"></span> Downloading...</>
            ) : "🚀 Download"}
          </button>
        </div>

        {result && !result.success && (
          <div style={{ color: '#f87171', fontSize: '0.9rem', marginTop: '1rem', background: 'rgba(248, 113, 113, 0.1)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
            ⚠️ {result.message}
          </div>
        )}

        {isDownloaded && (
          <div className="download-layout animate-fade-in" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px dashed var(--line)' }}>
            
            {/* Left Side: Form Details */}
            <div className="download-left">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Video Details</h2>
                <button
                  type="button"
                  onClick={generateAllContentWithAi}
                  disabled={isAiGenerating || !title}
                  className="premium-ai-btn"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  {isAiGenerating ? (
                    <><span className="ai-loader" style={{ width: '14px', height: '14px' }}></span> Generating Magic...</>
                  ) : "✨ Optimize with AI"}
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
                    style={{ paddingRight: '60px' }}
                  />
                  <span className="char-count" style={{ position: 'absolute', right: '12px', top: '42px', fontSize: '0.75rem', color: 'var(--muted)', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>
                    {title.length}/100
                  </span>
                </label>

                <label>
                  Description
                  <textarea
                    rows={5}
                    maxLength={5000}
                    placeholder="Viral tags and description..."
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                  <label style={{ margin: 0 }}>
                    Privacy Status
                    <select
                      value={privacyStatus}
                      onChange={(event) => setPrivacyStatus(event.target.value)}
                      disabled={isScheduled}
                      style={{ marginTop: '8px' }}
                    >
                      <option value="private">Private</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="public">Public</option>
                    </select>
                  </label>

                  <label style={{ margin: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', cursor: 'pointer', height: '100%', paddingTop: '28px' }}>
                    <input
                      type="checkbox"
                      checked={isScheduled}
                      onChange={(event) => setIsScheduled(event.target.checked)}
                      style={{ width: '22px', height: '22px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600 }}>Schedule Post</span>
                  </label>
                </div>

                {isScheduled && (
                  <div className="animate-fade-in" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(99, 102, 241, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <label style={{ margin: 0 }}>
                      Date
                      <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} style={{ marginTop: '8px' }} />
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <label style={{ flex: 1, margin: 0 }}>
                        Time
                        <select value={scheduleHour} onChange={(e) => setScheduleHour(e.target.value)} style={{ marginTop: '8px' }}>
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
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', width: '100%', marginTop: '2rem', padding: '16px' }}
                >
                  {activeAction === "upload" ? (
                    <><span className="ai-loader"></span> Uploading...</>
                  ) : "🚀 Upload to YouTube Now"}
                </button>
              </form>

              {result && "watchUrl" in result && (
                <div className="animate-fade-in" style={{ marginTop: '1.5rem', padding: '16px', background: result.success ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)', border: `1px solid ${result.success ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`, borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: result.success ? '#4ade80' : '#f87171' }}>
                    {result.message}
                  </p>
                  {result.success && result.watchUrl && (
                    <a href={result.watchUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '8px', color: '#4ade80', fontWeight: 700, textDecoration: 'underline' }}>
                      View on YouTube ↗
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Right Side: Video Preview */}
            <div className="download-right">
              <div style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: '16px', padding: '12px', position: 'sticky', top: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Video Preview</p>
                  <button
                    type="button"
                    onClick={handleCrop}
                    disabled={isCropping}
                    className="secondary-btn"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                  >
                    {isCropping ? "✂️ Cropping..." : "✂️ Crop Last 2s"}
                  </button>
                </div>
                <video 
                  className="fixed-height-preview"
                  controls 
                  src={`${result.previewUrl}?t=${previewKey}`} 
                  key={`${result.previewUrl}-${previewKey}`} 
                  style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)', width: '100%', height: 'auto', maxHeight: '400px' }}
                />
              </div>
            </div>

          </div>
        )}
      </article>
    </main>
  );
}
