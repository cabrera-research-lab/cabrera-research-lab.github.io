import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthContext';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { SeoGeoHeader } from '@/apps/seo-geo/components/SeoGeoHeader';
import { ScoreRing } from '@/apps/seo-geo/components/ScoreRing';
import { CheckList } from '@/apps/seo-geo/components/CheckList';
import { HistoryChart } from '@/apps/seo-geo/components/HistoryChart';
import { KeywordsPanel } from '@/apps/seo-geo/components/KeywordsPanel';
import { SEO_GEO_BASE, seoGeoLoginPath, seoGeoPath } from '@/apps/seo-geo/constants';
import { getProperty, isPropertyId } from '@/apps/seo-geo/lib/properties';
import { hasKeywordDashboard } from '@/apps/seo-geo/lib/keywordConfig';
import { listPropertyHistory, refreshProperty, type SnapshotRow } from '@/apps/seo-geo/lib/snapshotApi';
import { RefreshButton } from '@/apps/seo-geo/components/RefreshButton';
import type { PropertyId } from '@/apps/seo-geo/lib/types';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="seo-geo-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function PropertyPage() {
  const { propertyId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const tab = searchParams.get('tab') === 'keywords' ? 'keywords' : 'health';

  const load = useCallback(async (quiet = false) => {
    if (!session || !isSupabaseConfigured || !isPropertyId(propertyId)) {
      setRows([]);
      return;
    }
    if (!quiet) setLoading(true);
    setError(null);
    try {
      setRows(await listPropertyHistory(propertyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load history');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [session, propertyId]);

  const onRefresh = useCallback(
    async (id: PropertyId | 'all') => {
      if (!session || id === 'all') return;
      setRefreshing(true);
      setError(null);
      try {
        await refreshProperty(id);
        await load(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Refresh failed');
      } finally {
        setRefreshing(false);
      }
    },
    [session, load],
  );

  useEffect(() => {
    if (authLoading) return;
    load().catch(console.error);
  }, [authLoading, load]);

  if (!isPropertyId(propertyId)) {
    return <Navigate to={SEO_GEO_BASE} replace />;
  }

  const property = getProperty(propertyId);
  const latest = rows[0] ?? null;
  const page = latest?.parsed.home;
  const robots = latest?.parsed.robots;
  const showKeywords = hasKeywordDashboard(property.id);
  const onTab = (next: 'health' | 'keywords') => {
    setSearchParams(next === 'keywords' ? { tab: 'keywords' } : {}, { replace: true });
  };

  return (
    <div className="seo-geo">
      <SeoGeoHeader />

      <div className="seo-geo-detail-bar">
        <Link to={seoGeoPath()} className="seo-geo-back">
          ← All properties
        </Link>
        <div className="seo-geo-detail-actions">
          {session && (
            <RefreshButton propertyId={property.id} busy={refreshing} onRefresh={onRefresh} />
          )}
          <a className="seo-geo-link" href={property.fetchUrl} target="_blank" rel="noreferrer">
            Open {property.label}
          </a>
        </div>
      </div>

      <section className="seo-geo-card seo-geo-detail-title">
        <p className="seo-geo-kicker">{property.platformLabel}</p>
        <h2>{property.label}</h2>
        <p className="seo-geo-small">{property.description}</p>
        {showKeywords && (
          <div className="seo-geo-tabs">
            <button
              type="button"
              className={`seo-geo-tab${tab === 'health' ? ' active' : ''}`}
              onClick={() => onTab('health')}
            >
              Health
            </button>
            <button
              type="button"
              className={`seo-geo-tab${tab === 'keywords' ? ' active' : ''}`}
              onClick={() => onTab('keywords')}
            >
              Keywords
            </button>
          </div>
        )}
      </section>

      {!authLoading && isSupabaseConfigured && !session && (
        <p className="seo-geo-signin-prompt">
          Sign in to view checks and history.{' '}
          <Link to={seoGeoLoginPath(seoGeoPath(propertyId) + (tab === 'keywords' ? '?tab=keywords' : ''))} className="seo-geo-link">
            Sign in
          </Link>
        </p>
      )}

      {showKeywords && tab === 'keywords' && session && <KeywordsPanel propertyId={property.id} />}

      {tab === 'health' && loading && <p className="seo-geo-small">Loading snapshots…</p>}
      {tab === 'health' && error && <p className="seo-geo-error">{error}</p>}

      {tab === 'health' && session && !loading && !latest && (
        <section className="seo-geo-card">
          <h2>No snapshots yet</h2>
          <p className="seo-geo-small">
            Use <strong>Refresh</strong> above to collect the first snapshot for this property.
          </p>
        </section>
      )}

      {tab === 'health' && latest && (
        <>
          <section className="seo-geo-card">
            <div className="seo-geo-score-row">
              <ScoreRing label="SEO" score={latest.health.seo.score} status={latest.health.seo.status} />
              <ScoreRing label="GEO" score={latest.health.geo.score} status={latest.health.geo.status} />
              <div>
                <p className="seo-geo-status">{latest.health.overallStatus}</p>
                <p className="seo-geo-small">Last collected {formatWhen(latest.fetchedAt)}</p>
                <p className="seo-geo-small">
                  Rubric: {property.rubric.replace('-', ' ')} · canonical host {property.canonicalHost}
                </p>
              </div>
            </div>
          </section>

          <section className="seo-geo-card">
            <h2>Latest facts</h2>
            <dl className="seo-geo-facts">
              <Fact label="Fetched URL" value={latest.parsed.homeDoc?.finalUrl ?? property.fetchUrl} />
              <Fact label="HTTP" value={String(latest.parsed.homeDoc?.status ?? 'n/a')} />
              <Fact label="Title" value={page?.title ?? '—'} />
              <Fact label="Canonical" value={page?.canonical ?? '—'} />
              <Fact label="H1" value={page?.h1[0] ?? '—'} />
              <Fact
                label="JSON-LD"
                value={page?.jsonLdTypes.length ? page.jsonLdTypes.join(', ') : 'None'}
              />
              <Fact
                label="GPTBot"
                value={robots?.aiBots.GPTBot ?? 'n/a'}
              />
              <Fact
                label="ClaudeBot"
                value={robots?.aiBots.ClaudeBot ?? 'n/a'}
              />
              <Fact
                label="PerplexityBot"
                value={robots?.aiBots.PerplexityBot ?? 'n/a'}
              />
              <Fact
                label="llms.txt"
                value={
                  latest.parsed.llms
                    ? `HTTP ${latest.parsed.llms.status}${latest.parsed.llms.hasSubstance ? ' · present' : ''}`
                    : 'n/a'
                }
              />
            </dl>
          </section>

          <div className="seo-geo-grid">
            <CheckList title="SEO checks" checks={latest.health.seo.checks} />
            <CheckList title="GEO checks" checks={latest.health.geo.checks} />
          </div>

          <section className="seo-geo-card">
            <h2>Trend</h2>
            <p className="seo-geo-small">Blue is SEO. Orange is GEO. One pair of bars per day; Refresh updates today.</p>
            <HistoryChart rows={rows} />
          </section>
        </>
      )}

      <div className="seo-geo-footer">©2026 GO∆TNET Internal Private and Confidential</div>
    </div>
  );
}
