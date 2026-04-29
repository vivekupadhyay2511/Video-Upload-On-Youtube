"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-section" style={{ width: 'min(1200px, 100%)', textAlign: 'center', padding: '40px 20px 20px' }}>
        <h1 className="gradient-text" style={{ marginBottom: '16px' }}>YouTube Automation Studio</h1>

        <p style={{
          color: 'var(--muted)',
          fontSize: '1.1rem',
          lineHeight: '1.6',
          maxWidth: '600px',
          margin: '0 auto 32px',
          fontWeight: 400
        }}>
          The all-in-one professional toolkit for creators. Automate your YouTube workflow with AI-powered tools for content generation and seamless bulk publishing.
        </p>

        <div className="feature-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginTop: '10px'
        }}>
          {/* Feature Card 1 */}
          <Link href="/upload-video-by-link" style={{ textDecoration: 'none' }}>
            <div className="feature-card hover-card" style={{
              padding: '24px',
              border: '1px solid var(--line)',
              borderRadius: '20px',
              background: 'var(--card)',
              height: '100%',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div className="card-icon" style={{
                fontSize: '2rem',
                marginBottom: '16px',
                background: 'rgba(99, 102, 241, 0.1)',
                width: '48px',
                height: '48px',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '12px'
              }}>🚀</div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px', color: '#fff' }}>Single Video Upload</h3>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--muted)', lineHeight: '1.5' }}>
                  Download and optimize individual videos with AI.
                </p>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: 700, fontSize: '0.9rem' }}>
                Get Started <span>→</span>
              </div>
            </div>
          </Link>

          {/* Feature Card 2 */}
          <Link href="/upload-multiple-video" style={{ textDecoration: 'none' }}>
            <div className="feature-card hover-card" style={{
              padding: '24px',
              border: '1px solid var(--line)',
              borderRadius: '20px',
              background: 'var(--card)',
              height: '100%',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div className="card-icon" style={{
                fontSize: '2rem',
                marginBottom: '16px',
                background: 'rgba(168, 85, 247, 0.1)',
                width: '48px',
                height: '48px',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '12px'
              }}>📁</div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px', color: '#fff' }}>Upload Multiple Video</h3>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--muted)', lineHeight: '1.5' }}>
                  Bulk process and schedule content via Excel/CSV.
                </p>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: 700, fontSize: '0.9rem' }}>
                Get Started <span>→</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="stats-section" style={{
          marginTop: '40px',
          padding: '24px',
          borderTop: '1px solid var(--line)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '20px'
        }}>
          <div className="stat-item">
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>10x</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Faster Publishing</div>
          </div>
          <div className="stat-item">
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>100%</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Automated</div>
          </div>
          <div className="stat-item">
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>AI</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Optimized</div>
          </div>
          <div className="stat-item">
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>Secure</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>OAuth Protected</div>
          </div>
        </div>

        {/* Coming Soon Section */}
        <div style={{
          marginTop: '60px',
          padding: '32px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '24px',
          border: '1px dashed var(--line)',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 8px', color: 'var(--muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            On the Roadmap
          </h4>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', opacity: 0.5 }}>
            <span style={{ fontSize: '0.9rem' }}>🤖 AI Script Generator</span>
            <span style={{ fontSize: '0.9rem' }}>🎨 Auto-Thumbnail Maker</span>
            <span style={{ fontSize: '0.9rem' }}>📊 Advanced Analytics</span>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .hover-card:hover {
            transform: translateY(-8px);
            background: rgba(255, 255, 255, 0.05) !important;
            border-color: var(--accent) !important;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          }
          
          .hover-card:hover .card-icon {
            transform: scale(1.1);
            transition: transform 0.3s ease;
          }

          @media (max-width: 768px) {
            .feature-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </section>
    </main>
  );
}
