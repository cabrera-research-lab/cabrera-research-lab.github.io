import { useCallback, useEffect, useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthContext';
import { signOut } from '@/shared/lib/authApi';
import { useDesktopNotificationPreference } from '@/shared/notifications/useDesktopNotificationPreference';
import { INTERNAL_TOOLS, isToolActive } from '@/shared/navigation/tools';
import '@/shared/navigation/site-nav.css';

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`site-nav-icon${open ? ' open' : ''}`}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="M3 5h14" />
      <path d="M3 10h14" />
      <path d="M3 15h14" />
    </svg>
  );
}

function DesktopNotificationToggle() {
  const { supported, enabled, permission, setEnabled } = useDesktopNotificationPreference();

  if (!supported) return null;

  const label =
    permission === 'denied'
      ? 'Desktop notifications blocked in browser settings'
      : enabled
        ? 'Desktop notifications on'
        : 'Turn on desktop notifications';

  async function handleToggle() {
    if (permission === 'denied') return;
    await setEnabled(!enabled);
  }

  return (
    <button
      type="button"
      className={`site-nav-notifications${enabled ? ' active' : ''}`}
      aria-pressed={enabled}
      aria-label={label}
      title={label}
      disabled={permission === 'denied'}
      onClick={handleToggle}
    >
      {enabled ? 'Alerts on' : 'Alerts off'}
    </button>
  );
}

export function SiteNav() {
  const { pathname } = useLocation();
  const { user, profile, team, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);
  const displayName = profile?.display_name?.trim() || user?.email || '';

  async function handleSignOut() {
    await signOut();
  }

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('site-nav-open');

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('site-nav-open');
    };
  }, [open, close]);

  return (
    <>
      <header className="site-nav-bar">
        <button
          type="button"
          className="site-nav-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? 'Close tools menu' : 'Open tools menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <HamburgerIcon open={open} />
        </button>
        <span className="site-nav-bar-label">STSI GO∆TNET</span>
        {!loading && user && displayName ? (
          <div className="site-nav-user">
            <DesktopNotificationToggle />
            <span className="site-nav-user-name">{displayName}</span>
            {team ? (
              <>
                <span className="site-nav-user-sep" aria-hidden="true">
                  ·
                </span>
                <span className="site-nav-team-name">{team.name}</span>
              </>
            ) : null}
            <button type="button" className="site-nav-sign-out" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        ) : null}
      </header>

      {open && (
        <button type="button" className="site-nav-backdrop" aria-label="Close menu" onClick={close} />
      )}

      <nav
        id={panelId}
        className={`site-nav-panel${open ? ' open' : ''}`}
        aria-label="Internal tools"
        aria-hidden={!open}
      >
        <div className="site-nav-panel-head">
          <h2>GO∆TNET</h2>
        </div>

        <ul className="site-nav-list">
          {INTERNAL_TOOLS.map((tool) => {
            const active = isToolActive(tool, pathname);
            return (
              <li key={tool.id}>
                <Link
                  to={tool.path}
                  className={`site-nav-link${active ? ' active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={close}
                >
                  <span className="site-nav-link-label">{tool.label}</span>
                  <span className="site-nav-link-title">{tool.title}</span>
                  <span className="site-nav-link-desc">{tool.description}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
