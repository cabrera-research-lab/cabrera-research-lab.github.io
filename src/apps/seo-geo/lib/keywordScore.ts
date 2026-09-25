import { isBrandQuery } from '@/apps/seo-geo/lib/keywordConfig';
import type { GscConnection, QueryDailyRow, QueryRollup, TargetKeyword } from '@/apps/seo-geo/lib/keywordTypes';
import type { PropertyId } from '@/apps/seo-geo/lib/types';

export type KeywordFilter = 'all' | 'brand' | 'nonbrand';

const WINDOW_DAYS = 28;

export function windowStartDate(end = new Date()): string {
  const start = new Date(end.getTime() - (WINDOW_DAYS - 1) * 86400000);
  return start.toISOString().slice(0, 10);
}

export function rollupQueries(rows: QueryDailyRow[], filter: KeywordFilter = 'all'): QueryRollup[] {
  const byQuery = new Map<string, Omit<QueryRollup, 'ctr' | 'position'>>();
  for (const row of rows) {
    const brand = isBrandQuery(row.query, row.propertyId as PropertyId);
    if (filter === 'brand' && !brand) continue;
    if (filter === 'nonbrand' && brand) continue;
    const existing = byQuery.get(row.query);
    if (!existing) {
      byQuery.set(row.query, {
        query: row.query,
        clicks: row.clicks,
        impressions: row.impressions,
        positionWeighted: row.position * row.impressions,
        pages: new Set(row.page ? [row.page] : []),
        brand,
      });
    } else {
      existing.clicks += row.clicks;
      existing.impressions += row.impressions;
      existing.positionWeighted += row.position * row.impressions;
      if (row.page) existing.pages.add(row.page);
    }
  }

  return [...byQuery.values()]
    .map((item) => ({
      ...item,
      ctr: item.impressions > 0 ? item.clicks / item.impressions : 0,
      position: item.impressions > 0 ? item.positionWeighted / item.impressions : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks);
}

export function totals(rollups: QueryRollup[]) {
  const clicks = rollups.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = rollups.reduce((sum, row) => sum + row.impressions, 0);
  const positionWeighted = rollups.reduce((sum, row) => sum + row.position * row.impressions, 0);
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? positionWeighted / impressions : 0,
    queries: rollups.length,
  };
}

export function matchTargets(targets: TargetKeyword[], rollups: QueryRollup[]) {
  const byQuery = new Map(rollups.map((row) => [row.query.toLowerCase(), row]));
  return targets
    .filter((target) => target.active)
    .map((target) => {
      const hit = byQuery.get(target.phrase.toLowerCase());
      return {
        phrase: target.phrase,
        kind: target.kind,
        clicks: hit?.clicks ?? 0,
        impressions: hit?.impressions ?? 0,
        ctr: hit?.ctr ?? 0,
        position: hit?.position ?? 0,
        hasImpressions: (hit?.impressions ?? 0) > 0,
      };
    });
}

export function connectionLabel(connection: GscConnection | null): string {
  if (!connection) return 'Not connected';
  if (connection.status === 'connected') {
    return connection.gscSiteUrl ? `Connected · ${connection.gscSiteUrl}` : 'Connected';
  }
  if (connection.status === 'error') return 'GSC error';
  return 'Not connected';
}
