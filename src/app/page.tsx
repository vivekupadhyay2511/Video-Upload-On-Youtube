"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card" style={{ maxWidth: '700px', textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '2.4rem', marginBottom: '12px' }}>YouTube Automation Studio</h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem', lineHeight: '1.6' }}>
            The all-in-one professional toolkit for creators. Automate your YouTube workflow with AI-powered tools for content generation and seamless publishing.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '32px' }}>
          <Link href="/upload-video-by-link" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '24px',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.5)',
              height: '100%',
              transition: 'transform 0.2s, background 0.2s',
              cursor: 'pointer'
            }}
            className="hover-card">
              <h3 style={{ margin: '0 0 8px', color: 'var(--accent)' }}>🚀 Quick Upload</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                Download from YouTube/Instagram and upload directly with AI optimization.
              </p>
            </div>
          </Link>

          <Link href="/ai-studio" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '24px',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.5)',
              height: '100%',
              transition: 'transform 0.2s, background 0.2s',
              cursor: 'pointer'
            }}
            className="hover-card">
              <h3 style={{ margin: '0 0 8px', color: 'var(--accent)' }}>✨ AI Studio</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                Generate viral titles, descriptions, and ultra-realistic images for your content.
              </p>
            </div>
          </Link>
        </div>

        <div style={{ marginTop: '40px', padding: '20px', borderTop: '1px solid var(--line)' }}>
          <h4 style={{ margin: '0 0 16px', opacity: 0.6 }}>Core Features</h4>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', fontSize: '0.9rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✅ Smart Scheduling</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✅ AI Optimization</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✅ Cross-Platform Support</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✅ Secure OAuth Setup</span>
          </div>
        </div>

        <style jsx>{`
          .hover-card:hover {
            transform: translateY(-4px);
            background: white !important;
            box-shadow: 0 12px 30px rgba(0,0,0,0.06);
          }
        `}</style>
      </section>
    </main>
  );
}
