import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthContext';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { SeoGeoHeader } from '@/apps/seo-geo/components/SeoGeoHeader';
import { ScoreRing } from '@/apps/seo-geo/components/ScoreRing';
import { seoGeoLoginPath, seoGeoPath } from '@/apps/seo-geo/constants';
import { PROPERTIES } from '@/apps/seo-geo/lib/properties';
import { scoreStatusClass } from '@/apps/seo-geo/lib/healthScore';
import { listLatestSnapshots, type SnapshotRow } from '@/apps/seo-geo/lib/snapshotApi';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export function PortfolioPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session || !isSupabaseConfigured) {
      setSnapshots([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSnapshots(await listLatestSnapshots());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load snapshots');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    load().catch(console.error);
  }, [authLoading, load]);

  const byId = new Map(snapshots.map((row) => [row.propertyId, row]));

  return (
    <div className="seo-geo">
      <SeoGeoHeader />

      <section className="seo-geo-card">
        <div className="seo-geo-list-head">
          <div>
            <h2>Properties</h2>
            <p className="seo-geo-small">
              Nightly collector stores public HTML, robots.txt, sitemaps, and llms.txt. Scores use a
              platform-specific rubric — Camp is not graded like a marketing site.
            </p>
          </div>
        </div>

        {!authLoading && !isSupabaseConfigured && (
          <p className="seo-geo-error">
            Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
          </p>
        )}

        {!authLoading && isSupabaseConfigured && !session && (
          <p className="seo-geo-signin-prompt">
            Sign in to view SEO and GEO health.{' '}
            <Link to={seoGeoLoginPath()} className="seo-geo-link">
              Sign in
            </Link>
          </p>
        )}

        {loading && <p className="seo-geo-small">Loading latest snapshots…</p>}
        {error && <p className="seo-geo-error">{error}</p>}

        <ul className="seo-geo-portfolio">
          {PROPERTIES.map((property) => {
            const row = byId.get(property.id);
            const seo = row?.health.seo.score ?? null;
            const geo = row?.health.geo.score ?? null;
            const overall = row?.health.overallStatus ?? 'No data';
            return (
              <li key={property.id}>
                <button
                  type="button"
                  className="seo-geo-property-card"
                  onClick={() => navigate(seoGeoPath(property.id))}
                >
                  <div className="seo-geo-property-top">
                    <div>
                      <strong>{property.label}</strong>
                      <span className="seo-geo-small">{property.platformLabel}</span>
                    </div>
                    <span className={`seo-geo-status-chip ${scoreStatusClass(seo == null || geo == null ? null : Math.min(seo, geo))}`}>
                      {overall}
                    </span>
                  </div>
                  <p className="seo-geo-small">{property.description}</p>
                  <div className="seo-geo-property-scores">
                    <ScoreRing label="SEO" score={seo} status={row?.health.seo.status} />
                    <ScoreRing label="GEO" score={geo} status={row?.health.geo.status} />
                  </div>
                  <span className="seo-geo-small">
                    {row ? `Checked ${formatWhen(row.fetchedAt)}` : 'No snapshot yet — run Collect SEO & GEO'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="seo-geo-footer">©2026 GO∆TNET Internal Private and Confidential</div>
    </div>
  );
}
