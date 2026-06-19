import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { MissionMomentsHeader } from '@/components/missionMoments/MissionMomentsHeader';
import { listCohorts, type CohortSummary } from '@/lib/missionMomentsCohortApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import '@/styles/b2bQcApplet.css';

function statusClass(score: number | null): string {
  if (score === 100) return 'ready';
  if (score != null && score >= 75) return 'warn';
  if (score != null) return 'bad';
  return 'neutral';
}

export function CohortListPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [cohorts, setCohorts] = useState<CohortSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="b2b-qc">
      <MissionMomentsHeader />

      <section className="b2b-qc-card">
        <div className="b2b-qc-list-head">
          <div>
            <h2>Cohorts</h2>
            <p className="b2b-qc-small">Select a cohort to review or update QC status.</p>
          </div>
          {session && (
            <button type="button" className="primary" onClick={() => navigate('/b2b-qc/new')}>
              New cohort
            </button>
          )}
        </div>

        {!authLoading && isSupabaseConfigured && !session && (
          <p className="b2b-qc-signin-prompt">
            Sign in to view and manage cohort QC.{' '}
            <Link to="/login?next=/b2b-qc" className="b2b-qc-link">
              Sign in
            </Link>
          </p>
        )}

        {loading && <p className="b2b-qc-small">Loading cohorts…</p>}
        {error && <p className="b2b-qc-error">{error}</p>}

        {!loading && session && cohorts.length === 0 && (
          <div className="b2b-qc-empty">
            <p>No cohorts yet.</p>
            <button type="button" className="primary" onClick={() => navigate('/b2b-qc/new')}>
              Create first cohort
            </button>
          </div>
        )}

        {cohorts.length > 0 && (
          <ul className="b2b-qc-list">
            {cohorts.map((cohort) => (
              <li key={cohort.id}>
                <button
                  type="button"
                  className="b2b-qc-list-item"
                  onClick={() => navigate(`/b2b-qc/${cohort.id}`)}
                >
                  <div className="b2b-qc-list-main">
                    <strong>{cohort.name}</strong>
                    <span className="b2b-qc-small">
                      {cohort.company}
                      {cohort.startDate ? ` · Start ${cohort.startDate}` : ''}
                    </span>
                  </div>
                  <div className="b2b-qc-list-meta">
                    {cohort.qcScore != null && (
                      <span className={`b2b-qc-list-score ${statusClass(cohort.qcScore)}`}>
                        {cohort.qcScore}%
                      </span>
                    )}
                    {cohort.qcStatus && (
                      <span className={`b2b-qc-list-status ${statusClass(cohort.qcScore)}`}>
                        {cohort.qcStatus}
                      </span>
                    )}
                    <span className="b2b-qc-small">Updated {cohort.updated_at}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="b2b-qc-footer">©2026 GO∆TNET Internal Private and Confidential</div>
    </div>
  );
}
