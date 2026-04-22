"use client";

import { useState } from "react";

type ToolType = "text" | "image" | "video";

export default function AiStudioPage() {
  const [activeTool, setActiveTool] = useState<ToolType>("text");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      if (activeTool === "text") {
        const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent("Create a viral youtube title and description for: " + prompt)}`);
        const text = await res.text();
        setResult(text);
      } else if (activeTool === "image") {
        // For images, we just construct the URL
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux`;
        setResult(imageUrl);
      } else if (activeTool === "video") {
        setResult("Video generation requires an API key. (Coming soon)");
      }
    } catch {
      setResult("Error generating content.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero-card" style={{ maxWidth: '600px' }}>
        <a href="/" style={{ fontSize: '0.8rem', color: 'var(--muted)', textDecoration: 'none' }}>← Back</a>
        <h1 style={{ marginTop: '8px' }}>AI Studio</h1>
        
        <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
          {(["text", "image", "video"] as ToolType[]).map((tool) => (
            <button
              key={tool}
              onClick={() => { setActiveTool(tool); setResult(null); }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                background: activeTool === tool ? 'var(--accent)' : 'transparent',
                color: activeTool === tool ? 'white' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              {tool.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="video-form">
          <label>
            What are you creating?
            <textarea
              placeholder={activeTool === "image" ? "Describe the image..." : "Enter your video topic..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </label>
          <button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
            {loading ? "Generating..." : "Generate ✨"}
          </button>
        </div>

        {result && (
          <div style={{ marginTop: '20px', padding: '12px', border: '1px solid var(--line)', borderRadius: '12px', background: 'rgba(255,255,255,0.5)' }}>
            {activeTool === "text" && (
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'var(--text)' }}>{result}</pre>
            )}
            {activeTool === "image" && (
              <div style={{ textAlign: 'center' }}>
                <img src={result} alt="Generated" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <a href={result} download target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '8px', fontSize: '0.8rem', color: 'var(--accent)' }}>
                  Open Full Image
                </a>
              </div>
            )}
            {activeTool === "video" && (
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{result}</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
