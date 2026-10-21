import { NavLink } from 'react-router-dom';
import { TQ_BASE, tqPath } from '@/apps/tq-enhancement/constants';

export function TqHeader({ reviewer }: { reviewer: boolean }) {
  return (
    <header className="tq-header">
      <div className="tq-brand">
        <img
          src={`${import.meta.env.BASE_URL}logo_stsi.png`}
          alt="STSI Logo"
          className="tq-logo"
        />
        <div>
          <h1>TQ enhancement</h1>
          <p className="tq-sub">
            Mark each variant good or not, comment on it, and add variants of your own. Your notes stay on your copy.
          </p>
        </div>
      </div>
      <nav className="tq-nav" aria-label="TQ enhancement">
        <NavLink to={TQ_BASE} end className={({ isActive }) => (isActive ? 'on' : '')}>
          Your copy
        </NavLink>
        {reviewer ? (
          <NavLink to={tqPath('copies')} className={({ isActive }) => (isActive ? 'on' : '')}>
            All copies
          </NavLink>
        ) : null}
      </nav>
    </header>
  );
}
