import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthContext';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { SeoGeoHeader } from '@/apps/seo-geo/components/SeoGeoHeader';
import { ScoreRing } from '@/apps/seo-geo/components/ScoreRing';
import { CheckList } from '@/apps/seo-geo/components/CheckList';
import { HistoryChart } from '@/apps/seo-geo/components/HistoryChart';
import { SEO_GEO_BASE, seoGeoLoginPath, seoGeoPath } from '@/apps/seo-geo/constants';
import { getProperty, isPropertyId } from '@/apps/seo-geo/lib/properties';
import { listPropertyHistory, type SnapshotRow } from '@/apps/seo-geo/lib/snapshotApi';

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
  const { session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session || !isSupabaseConfigured || !isPropertyId(propertyId)) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRows(await listPropertyHistory(propertyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load history');
    } finally {
      setLoading(false);
    }
  }, [session, propertyId]);

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

  return (
    <div className="seo-geo">
      <SeoGeoHeader />

      <div className="seo-geo-detail-bar">
        <Link to={seoGeoPath()} className="seo-geo-back">
          ← All properties
        </Link>
        <a className="seo-geo-link" href={property.fetchUrl} target="_blank" rel="noreferrer">
          Open {property.label}
        </a>
      </div>

      <section className="seo-geo-card seo-geo-detail-title">
        <p className="seo-geo-kicker">{property.platformLabel}</p>
        <h2>{property.label}</h2>
        <p className="seo-geo-small">{property.description}</p>
      </section>

      {!authLoading && isSupabaseConfigured && !session && (
        <p className="seo-geo-signin-prompt">
          Sign in to view checks and history.{' '}
          <Link to={seoGeoLoginPath(seoGeoPath(propertyId))} className="seo-geo-link">
            Sign in
          </Link>
        </p>
      )}

      {loading && <p className="seo-geo-small">Loading snapshots…</p>}
      {error && <p className="seo-geo-error">{error}</p>}

      {session && !loading && !latest && (
        <section className="seo-geo-card">
          <h2>No snapshots yet</h2>
          <p className="seo-geo-small">
            Apply the <code>seo_geo_snapshots</code> migration, add the{' '}
            <code>SEO_GEO_SUPABASE_SERVICE_ROLE_KEY</code> GitHub secret, then run the{' '}
            <strong>Collect SEO &amp; GEO</strong> workflow (or <code>npm run collect:seo-geo</code> locally).
          </p>
        </section>
      )}

      {latest && (
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
            <p className="seo-geo-small">Blue is SEO. Orange is GEO. Re-scored with the current rubric.</p>
            <HistoryChart rows={rows} />
          </section>
        </>
      )}

      <div className="seo-geo-footer">©2026 GO∆TNET Internal Private and Confidential</div>
    </div>
  );
}
