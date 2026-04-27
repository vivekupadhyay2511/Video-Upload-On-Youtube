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
    link.href = "/YouTube Automation Studio Logo.png"
  }, []);

  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '32px 16px 0', width: '100%', position: 'sticky', top: 0, zIndex: 100 }}>
      <header className="app-header" style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        background: 'rgba(23, 23, 26, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--line)',
        borderRadius: '16px',
        padding: '12px 24px',
        width: 'min(1100px, 100%)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={authStatus?.ok && authStatus.channels && authStatus.channels.length > 0 && authStatus.channels[0].thumbnail
              ? authStatus.channels[0].thumbnail
              : "/YouTube Automation Studio Logo Dark.png"}
            alt="Logo"
            className="app-logo"
            style={{ borderRadius: '50%', objectFit: 'cover', width: '32px', height: '32px', border: '2px solid var(--accent)' }}
          />
          {!checkingAuth && authStatus?.ok ? (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', padding: '4px 10px', borderRadius: '99px', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
              Verified
            </span>
          ) : !checkingAuth ? (
            <a href="/reauth" className="header-verify-btn" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', background: 'rgba(248, 113, 113, 0.1)', padding: '4px 10px', borderRadius: '99px', border: '1px solid rgba(248, 113, 113, 0.2)', textDecoration: 'none' }}>
              Verify
            </a>
          ) : null}
        </div>

        <div className="header-center">
          <h2 className="header-title" style={{ fontSize: '1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
            YouTube Automation Studio
          </h2>
        </div>

        <div className="header-right" style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>

          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              padding: '8px 12px',
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
            className="menu-toggle-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            Menu
          </button>

          {isDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 12px)',
              right: 0,
              background: 'rgba(23, 23, 26, 0.95)',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              padding: '8px',
              minWidth: '220px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              zIndex: 100,
              backdropFilter: 'blur(30px)',
              animation: 'dropdownIn 0.2s ease-out'
            }}>
              <a href="/" onClick={() => setIsDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', textDecoration: 'none', color: 'var(--text)', borderRadius: '10px', fontSize: '0.9rem' }} className="menu-item">
                <span style={{ fontSize: '1.1rem' }}>🏠</span> Home
              </a>
              <a href="/upload-video-by-link" onClick={() => setIsDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', textDecoration: 'none', color: 'var(--text)', borderRadius: '10px', fontSize: '0.9rem' }} className="menu-item">
                <span style={{ fontSize: '1.1rem' }}>🚀</span> Single Video Upload
              </a>
              <a href="/upload-multiple-video" onClick={() => setIsDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', textDecoration: 'none', color: 'var(--text)', borderRadius: '10px', fontSize: '0.9rem' }} className="menu-item">
                <span style={{ fontSize: '1.1rem' }}>📁</span> Bulk Video Upload
              </a>
            </div>
          )}
          <style jsx>{`
            .nav-link:hover {
              color: var(--accent) !important;
            }
            .menu-item:hover {
              background: rgba(255,255,255,0.05);
              color: var(--accent) !important;
            }
            .menu-toggle-btn:hover {
              background: rgba(255,255,255,0.1);
              border-color: var(--accent);
            }
            @keyframes dropdownIn {
              from { opacity: 0; transform: translateY(10px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      </header>
    </div>
  );
}
