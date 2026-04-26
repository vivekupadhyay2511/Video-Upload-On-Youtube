"use client";

import { useEffect, useState } from "react";

type AuthStatus =
  | {
    ok: true;
    status: "authenticated";
    channels: Array<{ title?: string | null; id?: string | null; thumbnail?: string | null }>;
  }
  | { ok: false; status: "token_expired" | "missing_env" | "auth_error"; message: string }
  | null;

export default function Header() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => setAuthStatus(data as AuthStatus))
      .catch(() =>
        setAuthStatus({ ok: false, status: "auth_error", message: "Could not reach auth status endpoint." })
      )
      .finally(() => setCheckingAuth(false));
  }, []);

  // Update browser tab title and favicon
  useEffect(() => {
    document.title = "YouTube Automation Studio";
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = "/default-image.jpg";
  }, []);

  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '32px 16px 0', width: '100%' }}>
      <header className="app-header" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={authStatus?.ok && authStatus.channels && authStatus.channels.length > 0 && authStatus.channels[0].thumbnail
              ? authStatus.channels[0].thumbnail
              : "/default-image.jpg"}
            alt="Logo"
            title={authStatus?.ok && authStatus.channels && authStatus.channels.length > 0
              ? authStatus.channels[0].title || "YouTube Channel"
              : "Not Authenticated"}
            className="app-logo"
            style={{ borderRadius: authStatus?.ok ? '50%' : '0', objectFit: 'cover' }}
          />
          {!checkingAuth && authStatus?.ok ? (
            <span className="header-verified-badge">
              ✅ Verified
            </span>
          ) : !checkingAuth ? (
            <a href="/reauth" className="header-verify-btn">
              Verify 🔄
            </a>
          ) : null}
        </div>

        <div className="header-center">
          <h2 className="header-title" style={{ fontSize: '1.2rem', margin: 0 }}>
            YouTube Automation Studio
          </h2>
        </div>

        <div className="header-right" style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            Menu
          </button>

          {isDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: '12px',
              padding: '8px',
              minWidth: '180px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              zIndex: 100,
              backdropFilter: 'blur(10px)'
            }}>
              <a href="/" onClick={() => setIsDropdownOpen(false)} style={{ display: 'block', padding: '10px 12px', textDecoration: 'none', color: 'var(--text)', borderRadius: '8px', fontSize: '0.9rem' }} className="menu-item">
                🏠 Home
              </a>
              <a href="/upload-video-by-link" onClick={() => setIsDropdownOpen(false)} style={{ display: 'block', padding: '10px 12px', textDecoration: 'none', color: 'var(--text)', borderRadius: '8px', fontSize: '0.9rem' }} className="menu-item">
                🔗 Upload Video By Link
              </a>
              <a href="/upload-multiple-video" onClick={() => setIsDropdownOpen(false)} style={{ display: 'block', padding: '10px 12px', textDecoration: 'none', color: 'var(--text)', borderRadius: '8px', fontSize: '0.9rem' }} className="menu-item">
                📁 Upload Multiple Video
              </a>
              {/* <a href="/ai-studio" onClick={() => setIsDropdownOpen(false)} style={{ display: 'block', padding: '10px 12px', textDecoration: 'none', color: 'var(--text)', borderRadius: '8px', fontSize: '0.9rem' }} className="menu-item">
                ✨ AI Creative Studio
              </a> */}
            </div>
          )}
          <style jsx>{`
            .menu-item:hover {
              background: rgba(0,0,0,0.05);
              color: var(--accent) !important;
            }
          `}</style>
        </div>
      </header>
    </div>
  );
}
