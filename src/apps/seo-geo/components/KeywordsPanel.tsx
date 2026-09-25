import { useCallback, useEffect, useMemo, useState } from 'react';
import { getGscConnection, listQueryDaily, listTargetKeywords, refreshKeywords } from '@/apps/seo-geo/lib/keywordApi';
import { getProperty } from '@/apps/seo-geo/lib/properties';
import {
  connectionLabel,
  matchTargets,
  rollupQueries,
  totals,
  type KeywordFilter,
} from '@/apps/seo-geo/lib/keywordScore';
import type { GscConnection, QueryDailyRow, TargetKeyword } from '@/apps/seo-geo/lib/keywordTypes';
import type { PropertyId } from '@/apps/seo-geo/lib/types';

function formatWhen(iso: string | null): string {
  if (!iso) return 'never';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatPos(value: number): string {
  return value > 0 ? value.toFixed(1) : '—';
}

function pageLabel(pages: Set<string>): string {
  const list = [...pages];
  if (!list.length) return '—';
  try {
    const path = new URL(list[0]).pathname;
    return list.length > 1 ? `${path} +${list.length - 1}` : path || list[0];
  } catch {
    return list[0];
  }
}

export function KeywordsPanel({ propertyId }: { propertyId: PropertyId }) {
  const [connection, setConnection] = useState<GscConnection | null>(null);
  const [targets, setTargets] = useState<TargetKeyword[]>([]);
  const [rows, setRows] = useState<QueryDailyRow[]>([]);
  const [filter, setFilter] = useState<KeywordFilter>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const [nextConnection, nextTargets, nextRows] = await Promise.all([
          getGscConnection(propertyId),
          listTargetKeywords(propertyId),
          listQueryDaily(propertyId),
        ]);
        setConnection(nextConnection);
        setTargets(nextTargets);
        setRows(nextRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load keywords');
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [propertyId],
  );

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setNotice(null);
    try {
      const mode = await refreshKeywords(propertyId);
      await load(true);
      if (mode === 'stored') {
        setNotice(
          'Reloaded the last stored Search Console snapshot. In-app live pull is not deployed yet; nightly GitHub collect is the live source.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Keyword refresh failed.');
      await load(true).catch(() => undefined);
    } finally {
      setRefreshing(false);
    }
  }, [load, propertyId]);

  const property = getProperty(propertyId);
  const rollups = useMemo(() => rollupQueries(rows, filter), [rows, filter]);
  const summary = useMemo(() => totals(rollups), [rollups]);
  const targetRows = useMemo(
    () => matchTargets(targets, rollupQueries(rows, 'all')),
    [targets, rows],
  );

  const statusClass =
    connection?.status === 'connected' ? 'ready' : connection?.status === 'error' ? 'bad' : 'neutral';

  return (
    <div className="seo-geo-keywords">
      <section className="seo-geo-card">
        <div className="seo-geo-list-head">
          <div>
            <h2>Keywords · last 28 days</h2>
            <p className="seo-geo-small">
              Google Search Console queries for {property.label}. Average position is impression-weighted.
              Recent days can still be unfinalized. Rankings stay empty until this site is added in
              Search Console and the service account can read it.
            </p>
          </div>
          <button type="button" className="seo-geo-refresh" disabled={refreshing} onClick={onRefresh}>
            {refreshing ? 'Refreshing…' : 'Refresh keywords'}
          </button>
        </div>

        <div className="seo-geo-keyword-meta">
          <span className={`seo-geo-status-chip ${statusClass}`}>{connectionLabel(connection)}</span>
          <p className="seo-geo-small">Last synced {formatWhen(connection?.lastSyncedAt ?? null)}</p>
        </div>

        {loading && <p className="seo-geo-small">Loading keyword rows…</p>}
        {notice && <p className="seo-geo-notice">{notice}</p>}
        {error && <p className="seo-geo-error">{error}</p>}
        {connection?.lastError && connection.status !== 'connected' && (
          <p className="seo-geo-error">{connection.lastError}</p>
        )}

        {connection?.status !== 'connected' && !loading && (
          <ol className="seo-geo-setup">
            <li>
              Apply <code>supabase/migrations/20260918000000_seo_geo_gsc_queries.sql</code> and{' '}
              <code>20260925120000_seo_geo_gsc_all_properties.sql</code> in the Supabase SQL editor.
            </li>
            <li>
              In Google Search Console, add <code>{property.hosts.join(', ')}</code>. A domain property
              or URL-prefix property both work. A parent domain property covers its subdomains.
            </li>
            <li>
              Use the same Google Cloud service account as stsi.pro (Search Console API enabled). Add
              that email as a user on this Search Console property.
            </li>
            <li>
              Keep <code>GSC_SERVICE_ACCOUNT_JSON</code> set for the collector, then Refresh keywords
              or run <code>npm run collect:gsc</code>. Nightly collect skips a site until Search
              Console lists it.
            </li>
          </ol>
        )}
      </section>

      <section className="seo-geo-card">
        <div className="seo-geo-filter-row">
          {(['all', 'brand', 'nonbrand'] as KeywordFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`seo-geo-filter${filter === item ? ' active' : ''}`}
              onClick={() => setFilter(item)}
            >
              {item === 'all' ? 'All queries' : item === 'brand' ? 'Brand' : 'Non-brand'}
            </button>
          ))}
        </div>
        <div className="seo-geo-scorecards">
          <Scorecard label="Clicks" value={summary.clicks.toLocaleString()} />
          <Scorecard label="Impressions" value={summary.impressions.toLocaleString()} />
          <Scorecard label="CTR" value={formatPct(summary.ctr)} />
          <Scorecard label="Avg position" value={formatPos(summary.position)} />
          <Scorecard label="Queries" value={summary.queries.toLocaleString()} />
        </div>
      </section>

      <section className="seo-geo-card">
        <h2>Target phrases</h2>
        <p className="seo-geo-small">
          Curated list for {property.label}. No impressions means a content gap, or Search Console is
          not set up for this site yet. It is not a health-card fail.
        </p>
        <div className="seo-geo-table-wrap">
          <table className="seo-geo-table">
            <thead>
              <tr>
                <th>Phrase</th>
                <th>Kind</th>
                <th>Clicks</th>
                <th>Impressions</th>
                <th>CTR</th>
                <th>Avg pos</th>
              </tr>
            </thead>
            <tbody>
              {targetRows.map((row) => (
                <tr key={row.phrase}>
                  <td>{row.phrase}</td>
                  <td>{row.kind}</td>
                  <td>{row.clicks.toLocaleString()}</td>
                  <td>{row.hasImpressions ? row.impressions.toLocaleString() : '—'}</td>
                  <td>{row.hasImpressions ? formatPct(row.ctr) : '—'}</td>
                  <td>{row.hasImpressions ? formatPos(row.position) : 'no impressions'}</td>
                </tr>
              ))}
              {!targetRows.length && (
                <tr>
                  <td colSpan={6}>No target phrases yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="seo-geo-card">
        <h2>Queries Google already sends</h2>
        <p className="seo-geo-small">Sorted by impressions. Landing page is the top URL for that query.</p>
        <div className="seo-geo-table-wrap">
          <table className="seo-geo-table">
            <thead>
              <tr>
                <th>Query</th>
                <th>Clicks</th>
                <th>Impressions</th>
                <th>CTR</th>
                <th>Avg pos</th>
                <th>Page</th>
              </tr>
            </thead>
            <tbody>
              {rollups.slice(0, 50).map((row) => (
                <tr key={row.query}>
                  <td>
                    {row.query || '(anonymized)'}
                    {row.brand ? <span className="seo-geo-mini-chip">brand</span> : null}
                  </td>
                  <td>{row.clicks.toLocaleString()}</td>
                  <td>{row.impressions.toLocaleString()}</td>
                  <td>{formatPct(row.ctr)}</td>
                  <td>{formatPos(row.position)}</td>
                  <td className="seo-geo-page-cell">{pageLabel(row.pages)}</td>
                </tr>
              ))}
              {!rollups.length && (
                <tr>
                  <td colSpan={6}>
                    {connection?.status === 'connected'
                      ? 'GSC is connected but there are no query rows in the last 28 days.'
                      : 'No query rows yet. Connect GSC and refresh.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Scorecard({ label, value }: { label: string; value: string }) {
  return (
    <div className="seo-geo-scorecard">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
