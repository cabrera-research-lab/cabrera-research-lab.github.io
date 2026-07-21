import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthContext';
import {
  listCohorts,
  saveCohort,
  type CohortSummary,
} from '@/apps/mission-moments/lib/cohortApi';
import { DEFAULT_COHORT, DEFAULT_FINAL_CHECK } from '@/apps/mission-moments/lib/qcApplet';
import { missionMomentsPath } from '@/apps/mission-moments/constants';
import { isSupabaseConfigured } from '@/shared/lib/supabase';

function statusClass(score: number | null): string {
  if (score === 100) return 'ready';
  if (score != null && score >= 75) return 'warn';
  if (score != null) return 'bad';
  return 'neutral';
}

function scoreChip(score: number | null): string {
  if (score === 100) return '100% ready';
  if (score == null) return 'setup';
  return `${score}% · ${score >= 75 ? 'review' : 'setup'}`;
}

function ringStroke(c: string): string {
  return c === 'ready' ? '#2e9e78' : c === 'warn' ? '#e0a21a' : '#f0672e';
}

function ScoreRing({ score }: { score: number | null }) {
  const pct = score ?? 0;
  const c = statusClass(score);
  const off = Math.round(113 * (1 - pct / 100));
  return (
    <svg className="ring" viewBox="0 0 44 44" aria-hidden>
      <circle cx="22" cy="22" r="18" fill="none" stroke="#e2e4f1" strokeWidth="5" />
      <circle
        cx="22"
        cy="22"
        r="18"
        fill="none"
        stroke={ringStroke(c)}
        strokeWidth="5"
        strokeDasharray="113"
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
}

export function MissionMomentsPanel() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [cohorts, setCohorts] = useState<CohortSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cohortName, setCohortName] = useState('');
  const [moment, setMoment] = useState('');
  const [rel, setRel] = useState('');
  const [creating, setCreating] = useState(false);

  const loadCohorts = useCallback(async () => {
    if (!session || !isSupabaseConfigured) {
      setCohorts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setCohorts(await listCohorts());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load cohorts');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    loadCohorts().catch(console.error);
  }, [authLoading, loadCohorts]);

  function openDrawer() {
    setDate(new Date().toISOString().slice(0, 10));
    setCohortName('');
    setMoment('');
    setRel('');
    setDrawerOpen(true);
  }

  async function handleCreate() {
    const mo = moment.trim();
    if (!mo) return;
    setCreating(true);
    setError(null);
    try {
      const form = {
        ...DEFAULT_COHORT,
        company: cohortName.trim() || 'New cohort',
        startDate: date || DEFAULT_COHORT.startDate,
        notes: rel.trim() ? `${mo}\n\nRelevance: ${rel.trim()}` : mo,
      };
      const id = await saveCohort(null, form, { ...DEFAULT_FINAL_CHECK }, mo);
      setDrawerOpen(false);
      await loadCohorts();
      navigate(missionMomentsPath(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create moment');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mm-cascade">
      <div className="mm-list-head">
        <div>
          <h2 style={{ fontSize: 20 }}>Mission Moments</h2>
          <p>Dated cohort events, organized by date. Open one to run its QC.</p>
        </div>
        {session && (
          <button type="button" className="btn primary sm" onClick={openDrawer}>
            + New moment
          </button>
        )}
      </div>

      {loading && <p className="mini">Loading…</p>}
      {error && <p className="status-msg" style={{ color: 'var(--red)' }}>{error}</p>}

      {!loading && session && cohorts.length === 0 && (
        <div className="card mini">
          <p>No mission moments yet.</p>
          <button type="button" className="btn primary" style={{ marginTop: 8 }} onClick={openDrawer}>
            Create first moment
          </button>
        </div>
      )}

      {!loading &&
        cohorts.map((c) => (
          <Link key={c.id} to={missionMomentsPath(c.id)} className="cohort">
            <ScoreRing score={c.qcScore} />
            <span>
              <span className="cohort-name">{c.name}</span>
              <span className="cohort-meta">
                {[c.company, c.startDate].filter(Boolean).join(' · ') || 'Cohort QC'}
              </span>
            </span>
            <span className={`chip ${statusClass(c.qcScore)}`}>{scoreChip(c.qcScore)}</span>
          </Link>
        ))}

      {!session && !authLoading && (
        <p className="mini">
          <Link to={missionMomentsPath()}>Open Mission Moments</Link> to manage cohort QC.
        </p>
      )}

      <div
        className={`drawer-backdrop${drawerOpen ? ' on' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />
      <aside
        className={`drawer${drawerOpen ? ' on' : ''}`}
        aria-hidden={!drawerOpen}
        aria-label="New mission moment"
      >
        <div className="drawer-head">
          <div>
            <div className="drawer-eyebrow">New</div>
            <h2>Mission Moment</h2>
          </div>
          <button
            type="button"
            className="drawer-x"
            aria-label="Close"
            onClick={() => setDrawerOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="drawer-add">
          <div className="da-grid">
            <div>
              <label className="da-l">Date</label>
              <input
                type="date"
                className="da-in"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="da-l">Cohort</label>
              <input
                className="da-in"
                placeholder="Cohort name"
                value={cohortName}
                onChange={(e) => setCohortName(e.target.value)}
              />
            </div>
          </div>
          <label className="da-l" style={{ marginTop: 10 }}>
            The moment
          </label>
          <textarea
            className="da-in"
            style={{ minHeight: 56 }}
            placeholder="e.g. Northwind Q3 go-live"
            value={moment}
            onChange={(e) => setMoment(e.target.value)}
          />
          <label className="da-l" style={{ marginTop: 10 }}>
            Relevance to Mission
          </label>
          <input
            className="da-in"
            placeholder="Why it matters"
            value={rel}
            onChange={(e) => setRel(e.target.value)}
          />
          <button
            type="button"
            className="btn primary sm"
            style={{ width: '100%', marginTop: 12 }}
            onClick={handleCreate}
            disabled={creating || !moment.trim()}
          >
            {creating ? 'Creating…' : 'Create moment'}
          </button>
          <p className="drawer-hint">
            Cohort QC — belt path, domains, checklist — opens on the moment once created.
          </p>
        </div>
      </aside>
    </div>
  );
}
