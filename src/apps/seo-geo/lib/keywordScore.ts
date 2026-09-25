import { isBrandQuery } from '@/apps/seo-geo/lib/keywordConfig';
import type {
  GscConnection,
  KeywordAction,
  QueryDailyRow,
  QueryRollup,
  TargetKeyword,
} from '@/apps/seo-geo/lib/keywordTypes';
import type { PropertyId } from '@/apps/seo-geo/lib/types';

export type KeywordFilter = 'all' | 'brand' | 'nonbrand';

const WINDOW_DAYS = 28;
const SNIPPET_MIN_IMPRESSIONS = 25;
const SNIPPET_MAX_POSITION = 10;
const RANK_MIN_IMPRESSIONS = 20;
const RANK_MIN_POSITION = 8;
const RANK_MAX_POSITION = 20;
const MAX_ACTIONS = 8;

/** Rough organic CTR by rounded position. A benchmark for prioritizing rewrites, not a forecast. */
const EXPECTED_CTR_BY_POSITION = [0, 0.28, 0.15, 0.11, 0.08, 0.06, 0.045, 0.035, 0.028, 0.022, 0.018];

type QueryAcc = {
  query: string;
  clicks: number;
  impressions: number;
  positionWeighted: number;
  pages: Set<string>;
  pageImpressions: Map<string, number>;
  brand: boolean;
};

export function windowStartDate(end = new Date()): string {
  const start = new Date(end.getTime() - (WINDOW_DAYS - 1) * 86400000);
  return start.toISOString().slice(0, 10);
}

function topPage(pageImpressions: Map<string, number>): string {
  let best = '';
  let bestImpressions = -1;
  for (const [page, impressions] of pageImpressions) {
    if (impressions > bestImpressions) {
      best = page;
      bestImpressions = impressions;
    }
  }
  return best;
}

export function expectedCtr(position: number): number {
  if (position <= 0) return 0;
  const bucket = Math.min(30, Math.max(1, Math.round(position)));
  if (bucket <= 10) return EXPECTED_CTR_BY_POSITION[bucket];
  if (bucket <= 15) return 0.01;
  if (bucket <= 20) return 0.006;
  return 0.003;
}

export function rollupQueries(rows: QueryDailyRow[], filter: KeywordFilter = 'all'): QueryRollup[] {
  const byQuery = new Map<string, QueryAcc>();
  for (const row of rows) {
    const brand = isBrandQuery(row.query, row.propertyId as PropertyId);
    if (filter === 'brand' && !brand) continue;
    if (filter === 'nonbrand' && brand) continue;
    const existing = byQuery.get(row.query);
    if (!existing) {
      const pageImpressions = new Map<string, number>();
      if (row.page) pageImpressions.set(row.page, row.impressions);
      byQuery.set(row.query, {
        query: row.query,
        clicks: row.clicks,
        impressions: row.impressions,
        positionWeighted: row.position * row.impressions,
        pages: new Set(row.page ? [row.page] : []),
        pageImpressions,
        brand,
      });
    } else {
      existing.clicks += row.clicks;
      existing.impressions += row.impressions;
      existing.positionWeighted += row.position * row.impressions;
      if (row.page) {
        existing.pages.add(row.page);
        existing.pageImpressions.set(row.page, (existing.pageImpressions.get(row.page) ?? 0) + row.impressions);
      }
    }
  }

  return [...byQuery.values()]
    .map((item) => ({
      query: item.query,
      clicks: item.clicks,
      impressions: item.impressions,
      positionWeighted: item.positionWeighted,
      pages: item.pages,
      topPage: topPage(item.pageImpressions),
      brand: item.brand,
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

function matchesFilter(brand: boolean, filter: KeywordFilter): boolean {
  if (filter === 'brand') return brand;
  if (filter === 'nonbrand') return !brand;
  return true;
}

/**
 * Next edits worth making from the last 28 days.
 * Snippet: page-one query whose CTR sits well below a typical result at that rank.
 * Rank: query already seen between positions 8 and 20.
 * Gap: curated target phrase with no impressions, once Search Console has other data.
 */
export function buildKeywordActions(
  rollups: QueryRollup[],
  targets: TargetKeyword[],
  filter: KeywordFilter = 'all',
): KeywordAction[] {
  const actions: KeywordAction[] = [];
  const claimed = new Set<string>();

  for (const row of rollups) {
    if (!row.query.trim() || !matchesFilter(row.brand, filter)) continue;
    if (row.impressions < SNIPPET_MIN_IMPRESSIONS || row.position <= 0 || row.position > SNIPPET_MAX_POSITION) {
      continue;
    }
    const benchmark = expectedCtr(row.position);
    const missedClicks = row.impressions * (benchmark - row.ctr);
    if (benchmark <= 0 || row.ctr >= benchmark * 0.7 || missedClicks < 3) continue;
    const key = row.query.toLowerCase();
    claimed.add(key);
    actions.push({
      id: `snippet:${key}`,
      kind: 'snippet',
      query: row.query,
      brand: row.brand,
      page: row.topPage || null,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      position: row.position,
      expectedCtr: benchmark,
      missedClicks,
      impact: missedClicks,
    });
  }

  for (const row of rollups) {
    const key = row.query.toLowerCase();
    if (!row.query.trim() || claimed.has(key) || !matchesFilter(row.brand, filter)) continue;
    if (
      row.impressions < RANK_MIN_IMPRESSIONS ||
      row.position < RANK_MIN_POSITION ||
      row.position > RANK_MAX_POSITION
    ) {
      continue;
    }
    claimed.add(key);
    const lift = row.impressions * ((RANK_MAX_POSITION + 1 - row.position) / RANK_MAX_POSITION);
    actions.push({
      id: `rank:${key}`,
      kind: 'rank',
      query: row.query,
      brand: row.brand,
      page: row.topPage || null,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      position: row.position,
      expectedCtr: expectedCtr(row.position),
      missedClicks: 0,
      impact: lift,
    });
  }

  if (rollups.length > 0) {
    const seen = new Map(rollups.map((row) => [row.query.toLowerCase(), row]));
    for (const target of targets) {
      if (!target.active) continue;
      const key = target.phrase.toLowerCase();
      const brand = target.kind === 'brand';
      if (claimed.has(key) || !matchesFilter(brand, filter)) continue;
      const hit = seen.get(key);
      if (hit && hit.impressions > 0) continue;
      actions.push({
        id: `gap:${key}`,
        kind: 'gap',
        query: target.phrase,
        brand,
        page: null,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        position: 0,
        expectedCtr: 0,
        missedClicks: 0,
        impact: brand ? 2 : 5,
      });
    }
  }

  const take = (kind: KeywordAction['kind'], limit: number) =>
    actions
      .filter((action) => action.kind === kind)
      .sort((a, b) => b.impact - a.impact || a.query.localeCompare(b.query))
      .slice(0, limit);

  return [...take('snippet', 4), ...take('rank', 3), ...take('gap', 3)].slice(0, MAX_ACTIONS);
}

export function connectionLabel(connection: GscConnection | null): string {
  if (!connection) return 'Not connected';
  if (connection.status === 'connected') {
    return connection.gscSiteUrl ? `Connected · ${connection.gscSiteUrl}` : 'Connected';
  }
  if (connection.status === 'error') return 'GSC error';
  return 'Not connected';
}
