"use client";

import { useState, useEffect } from "react";

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
}

export default function VideoEditorPage() {
  const [clips, setClips] = useState<File[]>([]);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("9:16");
  const [useAiCaption, setUseAiCaption] = useState<boolean>(true);
  const [trendingMusic, setTrendingMusic] = useState<MusicTrack[]>([]);
  const [selectedMusicUrl, setSelectedMusicUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/music/trending")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTrendingMusic(data.data);
        }
      })
      .catch((err) => console.error("Failed to load music:", err));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setClips(Array.from(e.target.files));
    }
  };

  const handleGenerate = async () => {
    if (clips.length === 0) {
      setErrorMessage("Please upload at least one video clip.");
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    try {
      // Step 1: Upload Clips
      const formData = new FormData();
      clips.forEach((clip) => formData.append("clips", clip));

      const uploadRes = await fetch("/api/video/upload-clips", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        throw new Error(uploadData.message);
      }

      const sessionId = uploadData.sessionId;
      setIsUploading(false);
      setIsGenerating(true);

      // Step 2: Generate Final Video
      const generateRes = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          aspectRatio,
          useAiCaption,
          musicUrl: selectedMusicUrl || undefined,
        }),
      });

      const generateData = await generateRes.json();

      if (!generateData.success) {
        throw new Error(generateData.message);
      }

      setOutputUrl(`${generateData.outputUrl}?t=${Date.now()}`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred during video processing.");
    } finally {
      setIsUploading(false);
      setIsGenerating(false);
    }
  };

  return (
    <main className="page-shell">
      <article className="hero-card animate-fade-in" style={{ width: 'min(1200px, 100%)', display: 'flex', gap: '40px', flexWrap: 'wrap', padding: '40px' }}>
          
          {/* Left Column: Settings & Upload */}
          <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>AI Video Editor</h1>
              <p style={{ color: 'var(--muted)', fontSize: '1rem', margin: 0 }}>
                Upload clips, select music, and generate your viral video automatically.
              </p>
            </div>

            {errorMessage && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem' }}>
                {errorMessage}
              </div>
            )}

            <div className="video-form" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <label>
                1. Upload Clips
                <input 
                  type="file" 
                  multiple 
                  accept="video/*" 
                  onChange={handleFileChange}
                  style={{ width: '100%' }}
                />
                {clips.length > 0 && (
                  <p className="hint-text" style={{ color: 'var(--accent)', fontWeight: 600 }}>{clips.length} clip(s) selected.</p>
                )}
              </label>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600 }}>2. Aspect Ratio</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => setAspectRatio('16:9')}
                      className="secondary-btn"
                      style={{ flex: 1, borderColor: aspectRatio === '16:9' ? 'var(--accent)' : 'var(--line)', background: aspectRatio === '16:9' ? 'var(--accent-glow)' : 'rgba(255,255,255,0.05)', color: aspectRatio === '16:9' ? '#fff' : 'var(--muted)', padding: '12px' }}
                    >
                      16:9
                    </button>
                    <button 
                      onClick={() => setAspectRatio('9:16')}
                      className="secondary-btn"
                      style={{ flex: 1, borderColor: aspectRatio === '9:16' ? 'var(--accent)' : 'var(--line)', background: aspectRatio === '9:16' ? 'var(--accent-glow)' : 'rgba(255,255,255,0.05)', color: aspectRatio === '9:16' ? '#fff' : 'var(--muted)', padding: '12px' }}
                    >
                      9:16
                    </button>
                  </div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600 }}>3. AI Magic</label>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    cursor: 'pointer', 
                    padding: '10px 16px', 
                    background: useAiCaption ? 'var(--accent-glow)' : 'rgba(255,255,255,0.05)', 
                    border: `1px solid ${useAiCaption ? 'var(--accent)' : 'var(--line)'}`, 
                    borderRadius: 'var(--radius-md)',
                    height: '48px'
                  }}>
                    <input type="checkbox" checked={useAiCaption} onChange={(e) => setUseAiCaption(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: useAiCaption ? '#fff' : 'var(--muted)' }}>Viral Caption</span>
                  </label>
                </div>
              </div>

              <label>
                4. Trending Music
                <select value={selectedMusicUrl} onChange={(e) => setSelectedMusicUrl(e.target.value)} style={{ width: '100%' }}>
                  <option value="">No Music (Original Audio)</option>
                  {trendingMusic.map(track => (
                    <option key={track.id} value={track.url}>{track.title} - {track.artist}</option>
                  ))}
                </select>
                {selectedMusicUrl && (
                  <audio controls src={selectedMusicUrl} style={{ width: '100%', height: '32px', marginTop: '12px', borderRadius: '8px' }} />
                )}
              </label>

              <button 
                onClick={handleGenerate} 
                disabled={isUploading || isGenerating || clips.length === 0}
                className="primary-action"
                style={{ width: '100%', height: '56px', marginTop: '8px' }}
              >
                {isUploading ? "Uploading Clips..." : isGenerating ? "Processing Video..." : "Generate Final Video"}
              </button>
            </div>
          </div>

          {/* Right Column: Preview Player */}
          <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ 
              width: '100%', 
              flex: 1, 
              background: 'rgba(0,0,0,0.3)', 
              border: '1px solid var(--line)', 
              borderRadius: '24px', 
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: '500px',
              position: 'sticky',
              top: '20px'
            }}>
              <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Final Output Preview</p>
              
              {outputUrl ? (
                <video 
                  controls 
                  src={outputUrl} 
                  className="preview-video"
                  style={{ maxHeight: '600px', borderRadius: '12px', boxShadow: 'var(--shadow-premium)' }} 
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  <div style={{ padding: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', border: '1px solid var(--line)' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                      <line x1="7" y1="2" x2="7" y2="22"></line>
                      <line x1="17" y1="2" x2="17" y2="22"></line>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <line x1="2" y1="7" x2="7" y2="7"></line>
                      <line x1="2" y1="17" x2="7" y2="17"></line>
                      <line x1="17" y1="17" x2="22" y2="17"></line>
                      <line x1="17" y1="7" x2="22" y2="7"></line>
                    </svg>
                  </div>
                  <p style={{ maxWidth: '240px', lineHeight: '1.5' }}>Upload your clips and click generate to see the magic happen here.</p>
                </div>
              )}
            </div>
          </div>

      </article>
    </main>
  );
}
