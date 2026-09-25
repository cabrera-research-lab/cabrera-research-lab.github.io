export type GscConnectionStatus = 'missing' | 'connected' | 'error';

export type GscConnection = {
  propertyId: string;
  gscSiteUrl: string | null;
  status: GscConnectionStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  lastRowCount: number | null;
};

export type TargetKeyword = {
  id: string;
  propertyId: string;
  phrase: string;
  kind: 'brand' | 'nonbrand';
  active: boolean;
};

export type QueryDailyRow = {
  propertyId: string;
  date: string;
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type QueryRollup = {
  query: string;
  clicks: number;
  impressions: number;
  positionWeighted: number;
  position: number;
  ctr: number;
  pages: Set<string>;
  /** Landing page with the most impressions for this query. */
  topPage: string;
  brand: boolean;
};

export type KeywordActionKind = 'snippet' | 'rank' | 'gap';

export type KeywordAction = {
  id: string;
  kind: KeywordActionKind;
  query: string;
  brand: boolean;
  page: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  /** Typical CTR for this average position. Used only to rank snippet rewrites. */
  expectedCtr: number;
  missedClicks: number;
  impact: number;
};

export type KeywordCardTotals = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  queries: number;
};

export type KeywordCardStat = {
  propertyId: string;
  connection: GscConnection | null;
  totals: KeywordCardTotals | null;
};
