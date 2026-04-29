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
  const [progress, setProgress] = useState(0);

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
      setClips(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [objectUrls, setObjectUrls] = useState<Record<string, string>>({});

  // Generate stable object URLs for clips
  useEffect(() => {
    const newUrls: Record<string, string> = { ...objectUrls };
    clips.forEach(clip => {
      const key = `${clip.name}-${clip.size}`;
      if (!newUrls[key]) {
        newUrls[key] = URL.createObjectURL(clip);
      }
    });
    setObjectUrls(newUrls);
    // Note: In a real app we would revoke these on cleanup
  }, [clips]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    
    const newClips = [...clips];
    const draggedItem = newClips[draggedIndex];
    newClips.splice(draggedIndex, 1);
    newClips.splice(index, 0, draggedItem);
    
    setClips(newClips);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const removeClip = (index: number) => {
    setClips(clips.filter((_, i) => i !== index));
  };

  const [aiStyle, setAiStyle] = useState<string>("Viral");

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
          aiStyle,
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

  useEffect(() => {
    let interval: any;
    if (isUploading || isGenerating) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 95) {
            const increment = Math.max(0.1, (95 - prev) / 30);
            return prev + increment;
          }
          return prev;
        });
      }, 150);
    } else {
      setProgress(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isUploading, isGenerating]);

  return (
    <main className="page-shell" style={{ padding: '20px', height: '100vh', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: '1800px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Top Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '1.8rem', margin: 0 }}>AI Creative Studio</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Engineered for Viral content generation</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
             {errorMessage && (
               <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>
                 {errorMessage}
               </div>
             )}
             <button 
                onClick={handleGenerate} 
                disabled={isUploading || isGenerating || clips.length === 0}
                className="primary-action"
                style={{ height: '44px', padding: '0 24px' }}
              >
                {isUploading ? "Uploading..." : isGenerating ? "Processing..." : "Export Final Video"}
              </button>
          </div>
        </div>

        {/* Main Content Area: Split Screen */}
        <div style={{ display: 'flex', flex: 1, gap: '20px', minHeight: 0 }}>
          
          {/* Left Panel: AI Configuration */}
          <div className="hero-card" style={{ width: '250px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flexShrink: 0 }}>
            
            <section>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Upload Assets</label>
              <div style={{ 
                  border: '1px dashed var(--line)', 
                  borderRadius: '10px', 
                  padding: '16px', 
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  position: 'relative',
                  cursor: 'pointer'
                }}>
                  <input 
                    type="file" 
                    multiple 
                    accept="video/*" 
                    onChange={handleFileChange}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>🎥</div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>Add Media</div>
                </div>
            </section>

            <section>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. AI Vision Style</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {["Viral", "Epic", "Pro", "Funny"].map(style => (
                  <button 
                    key={style}
                    onClick={() => setAiStyle(style)}
                    className="secondary-btn"
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '8px', 
                      borderColor: aiStyle === style ? 'var(--accent)' : 'var(--line)', 
                      background: aiStyle === style ? 'var(--accent-glow)' : 'rgba(255,255,255,0.02)',
                      color: aiStyle === style ? '#fff' : 'var(--muted)'
                    }}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>3. Formatting</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setAspectRatio('16:9')} className="secondary-btn" style={{ flex: 1, fontSize: '0.75rem', padding: '8px', borderColor: aspectRatio === '16:9' ? 'var(--accent)' : 'var(--line)' }}>16:9</button>
                <button onClick={() => setAspectRatio('9:16')} className="secondary-btn" style={{ flex: 1, fontSize: '0.75rem', padding: '8px', borderColor: aspectRatio === '9:16' ? 'var(--accent)' : 'var(--line)' }}>9:16</button>
              </div>
            </section>

            <section>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>4. Audio Track</label>
              <select value={selectedMusicUrl} onChange={(e) => setSelectedMusicUrl(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', color: '#fff', fontSize: '0.8rem' }}>
                <option value="">Original Audio</option>
                {trendingMusic.map(track => (
                  <option key={track.id} value={track.url}>{track.title}</option>
                ))}
              </select>
            </section>

            <section>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <input type="checkbox" checked={useAiCaption} onChange={(e) => setUseAiCaption(e.target.checked)} style={{ width: '14px', height: '14px' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>AI Auto-Captions</span>
              </label>
            </section>
          </div>

          {/* Right Panel: Preview & Monitor */}
          <div className="hero-card" style={{ flex: 1, padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
               <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live Monitoring / Preview</span>
               {outputUrl && <span style={{ fontSize: '0.7rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }}></div> Ready for Export</span>}
            </div>
            
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifySelf: 'center', padding: '20px', background: '#000', position: 'relative' }}>
              
              {/* Overlay for Generation */}
              {(isUploading || isGenerating) && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                    <div style={{ 
                      width: '100%', 
                      maxWidth: '400px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '3rem', marginBottom: '20px', animation: 'float 3s infinite ease-in-out' }}>🧠</div>
                      <h3 style={{ margin: '0 0 10px', color: '#fff' }}>{isUploading ? "Transmitting Media" : "AI Vision Processing"}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '24px' }}>Analyzing pixel data to detect high-engagement hooks...</p>
                      
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.4s ease' }} />
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)' }}>{Math.round(progress)}% Completed</div>
                    </div>
                </div>
              )}

              {outputUrl ? (
                <video controls src={outputUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '100%', textAlign: 'center', color: 'var(--muted)' }}>
                   <div style={{ fontSize: '3rem', opacity: 0.3 }}>🎬</div>
                   <p>Composition Preview will appear after processing</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Panel: Timeline */}
        <div className="hero-card" style={{ height: '220px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Sequencer / Timeline ({clips.length} Clips)</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Drag assets to rearrange sequence</span>
          </div>
          
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            paddingBottom: '8px',
            scrollbarWidth: 'thin',
            alignItems: 'center'
          }}>
            {clips.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--line)', borderRadius: '8px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Timeline is empty. Upload clips to start editing.
              </div>
            ) : (
              clips.map((clip, index) => {
                const url = objectUrls[`${clip.name}-${clip.size}`];
                const blockAspectRatio = aspectRatio === '16:9' ? '16 / 9' : '9 / 16';
                const blockWidth = aspectRatio === '16:9' ? '260px' : '90px';
                
                return (
                  <div key={`${clip.name}-${index}`} style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    
                    {/* Drop Indicator - Left */}
                    {dragOverIndex === index && draggedIndex !== null && draggedIndex > index && (
                       <div style={{ width: '4px', height: '80%', background: 'var(--accent)', borderRadius: '4px', boxShadow: '0 0 15px var(--accent)', margin: '0 8px', transition: 'all 0.2s' }}></div>
                    )}

                    <div 
                      draggable="true"
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onDrop={() => handleDrop(index)}
                      style={{ 
                        width: blockWidth, 
                        aspectRatio: blockAspectRatio,
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '12px', 
                        border: `2px solid ${draggedIndex === index ? 'var(--accent)' : 'var(--line)'}`,
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'grab',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: draggedIndex === index ? 'scale(0.95)' : 'scale(1)',
                        boxShadow: draggedIndex === index ? '0 0 20px rgba(99, 102, 241, 0.3)' : 'none',
                        flexShrink: 0
                      }}
                    >
                      <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, zIndex: 2 }}>{index + 1}</div>
                      <button onClick={() => removeClip(index)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(239, 68, 68, 0.8)', border: 'none', color: '#fff', width: '24px', height: '24px', borderRadius: '6px', cursor: 'pointer', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>✕</button>
                      
                      {url ? (
                        <video 
                          src={url} 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover', 
                            pointerEvents: 'none',
                            transform: aspectRatio === '9:16' ? 'rotate(90deg) scale(1.8)' : 'rotate(0deg) scale(1)',
                            transition: 'transform 0.4s ease'
                          }} 
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Loading...</span>
                        </div>
                      )}
                      
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px', fontSize: '0.65rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: '#fff' }}>
                        {clip.name}
                      </div>
                    </div>

                    {/* Drop Indicator - Right */}
                    {dragOverIndex === index && draggedIndex !== null && draggedIndex < index && (
                       <div style={{ width: '4px', height: '100%', background: 'var(--accent)', borderRadius: '4px', boxShadow: '0 0 15px var(--accent)', margin: '0 8px', transition: 'all 0.2s' }}></div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .hero-card::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .hero-card::-webkit-scrollbar-thumb {
            background: var(--line);
            border-radius: 10px;
          }
        `}</style>

      </div>
    </main>
  );
}
