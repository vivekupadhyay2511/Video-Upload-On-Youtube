"use client";

import { useState } from "react";

export default function AIStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [enhancing, setEnhancing] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, seed: Math.floor(Math.random() * 1000000) }),
      });
      const data = await response.json();
      if (data.imageUrl) {
        setImages([data.imageUrl, ...images]);
      }
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setGenerating(false);
    }
  };

  const enhancePrompt = async () => {
    if (!prompt) return;
    setEnhancing(true);
    try {
      const response = await fetch("/api/ai/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: `Expand this image prompt into a detailed, ultra-realistic description for high-end AI generation. Include lighting, texture, and cinematic details. Keep it to 2-3 sentences. Original prompt: ${prompt}` 
        }),
      });
      const data = await response.json();
      if (data.title) {
        setPrompt(data.title);
      } else if (typeof data === 'string') {
        setPrompt(data);
      }
    } catch (error) {
      console.error("Error enhancing prompt:", error);
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <main className="page-shell ai-studio-container">
      <section className="hero-card glassmorphism animate-fade-in">
        <div className="studio-header">
          <h1 className="gradient-text">AI Creative Studio</h1>
          <p className="subtitle">Ultra-Realistic Image Generation powered by Flux</p>
        </div>

        <div className="prompt-section">
          <div className="input-wrapper">
            <textarea
              className="premium-input"
              placeholder="Describe what you want to create... (e.g., 'A futuristic city at sunset with neon lights, 8k resolution, cinematic lighting')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
            <div className="input-actions">
              <button 
                className="secondary-btn" 
                onClick={enhancePrompt} 
                disabled={enhancing || !prompt}
              >
                {enhancing ? "Enhancing..." : "✨ Enhance Prompt"}
              </button>
              <button 
                className="primary-action pulse-animation" 
                onClick={handleGenerate} 
                disabled={generating || !prompt}
              >
                {generating ? "Generating Masterpiece..." : "🎨 Generate Image"}
              </button>
            </div>
          </div>
        </div>

        {images.length > 0 && (
          <div className="gallery-section">
            <h2 className="section-title">Your Creations</h2>
            <div className="image-grid">
              {images.map((img, index) => (
                <div key={index} className="image-card animate-scale-up">
                  <img src={img} alt={`Generated ${index}`} />
                  <div className="image-overlay">
                    <a href={img} download target="_blank" rel="noreferrer" className="download-btn">
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <style jsx>{`
        .ai-studio-container {
          padding-top: 2rem;
          min-height: 100vh;
          background: radial-gradient(circle at top right, rgba(124, 58, 237, 0.1), transparent),
                      radial-gradient(circle at bottom left, rgba(236, 72, 153, 0.1), transparent);
        }

        .studio-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .gradient-text {
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
        }

        .prompt-section {
          max-width: 800px;
          margin: 0 auto 3rem;
        }

        .premium-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.5rem;
          color: white;
          font-size: 1.1rem;
          transition: all 0.3s ease;
          resize: none;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }

        .premium-input:focus {
          outline: none;
          border-color: #7c3aed;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.2);
        }

        .input-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          justify-content: flex-end;
        }

        .secondary-btn {
          background: transparent;
          border: 1px solid #7c3aed;
          color: #7c3aed;
          padding: 0.8rem 1.5rem;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .secondary-btn:hover:not(:disabled) {
          background: rgba(124, 58, 237, 0.1);
          transform: translateY(-2px);
        }

        .gallery-section {
          margin-top: 4rem;
        }

        .section-title {
          font-size: 1.8rem;
          margin-bottom: 2rem;
          text-align: center;
        }

        .image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
        }

        .image-card {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .image-card:hover {
          transform: scale(1.05);
        }

        .image-card img {
          width: 100%;
          height: auto;
          display: block;
        }

        .image-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .image-card:hover .image-overlay {
          opacity: 1;
        }

        .download-btn {
          background: white;
          color: black;
          padding: 0.8rem 2rem;
          border-radius: 30px;
          text-decoration: none;
          font-weight: 700;
          transition: transform 0.2s ease;
        }

        .download-btn:hover {
          transform: scale(1.1);
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(124, 58, 237, 0); }
          100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
        }

        .pulse-animation:not(:disabled) {
          animation: pulse 2s infinite;
        }
      `}</style>
    </main>
  );
}
