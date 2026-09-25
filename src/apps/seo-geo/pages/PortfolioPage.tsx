import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthContext';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { SeoGeoHeader } from '@/apps/seo-geo/components/SeoGeoHeader';
import { ScoreRing } from '@/apps/seo-geo/components/ScoreRing';
import { RefreshButton } from '@/apps/seo-geo/components/RefreshButton';
import { seoGeoLoginPath, seoGeoPath } from '@/apps/seo-geo/constants';
import { PROPERTIES } from '@/apps/seo-geo/lib/properties';
import { KEYWORD_DASHBOARD_PROPERTY_IDS } from '@/apps/seo-geo/lib/keywordConfig';
import { listGscConnections, listQueryDaily } from '@/apps/seo-geo/lib/keywordApi';
import { rollupQueries, totals } from '@/apps/seo-geo/lib/keywordScore';
import type { KeywordCardStat } from '@/apps/seo-geo/lib/keywordTypes';
import { PropertyKeywordsStrip } from '@/apps/seo-geo/components/PropertyKeywordsStrip';
import { scoreStatusClass } from '@/apps/seo-geo/lib/healthScore';
import { listLatestSnapshots, refreshProperty, type SnapshotRow } from '@/apps/seo-geo/lib/snapshotApi';
import type { PropertyId } from '@/apps/seo-geo/lib/types';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export function PortfolioPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [keywordStats, setKeywordStats] = useState<Record<string, KeywordCardStat>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<PropertyId | 'all' | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!session || !isSupabaseConfigured) {
      setSnapshots([]);
      setKeywordStats({});
      return;
    }
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [nextSnapshots, connections, querySets] = await Promise.all([
        listLatestSnapshots(),
        listGscConnections(),
        Promise.all(
          KEYWORD_DASHBOARD_PROPERTY_IDS.map(async (id) => ({
            id,
            rows: await listQueryDaily(id),
          })),
        ),
      ]);
      const connectionById = new Map(connections.map((item) => [item.propertyId, item]));
      const nextStats: Record<string, KeywordCardStat> = {};
      for (const id of KEYWORD_DASHBOARD_PROPERTY_IDS) {
        const querySet = querySets.find((item) => item.id === id);
        nextStats[id] = {
          propertyId: id,
          connection: connectionById.get(id) ?? null,
          totals: querySet ? totals(rollupQueries(querySet.rows)) : null,
        };
      }
      setSnapshots(nextSnapshots);
      setKeywordStats(nextStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load snapshots');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    load().catch(console.error);
  }, [authLoading, load]);

  const onRefresh = useCallback(
    async (propertyId: PropertyId | 'all') => {
      if (!session) return;
      setRefreshingId(propertyId);
      setError(null);
      try {
        await refreshProperty(propertyId);
        await load(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Refresh failed');
      } finally {
        setRefreshingId(null);
      }
    },
    [session, load],
  );

  const byId = new Map(snapshots.map((row) => [row.propertyId, row]));

  return (
    <div className="seo-geo">
      <SeoGeoHeader />

      <section className="seo-geo-card">
        <div className="seo-geo-list-head">
          <div>
            <h2>Properties</h2>
            <p className="seo-geo-small">
              Refresh re-fetches live HTML, robots.txt, sitemaps, and llms.txt. Keyword rankings
              show on each card after that site is added in Google Search Console.
            </p>
          </div>
          {session && (
            <RefreshButton propertyId="all" busy={refreshingId === 'all'} onRefresh={onRefresh} />
          )}
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
              <li key={property.id} className="seo-geo-property-item">
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
                </button>
                <PropertyKeywordsStrip
                  propertyId={property.id}
                  stat={keywordStats[property.id] ?? null}
                  onOpen={(path) => navigate(path)}
                />
                <div className="seo-geo-property-actions">
                  <span className="seo-geo-small">
                    {row ? `Checked ${formatWhen(row.fetchedAt)}` : 'No snapshot yet'}
                  </span>
                  {session && (
                    <RefreshButton
                      propertyId={property.id}
                      busy={refreshingId === property.id || refreshingId === 'all'}
                      onRefresh={onRefresh}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="seo-geo-footer">©2026 GO∆TNET Internal Private and Confidential</div>
    </div>
  );
}
