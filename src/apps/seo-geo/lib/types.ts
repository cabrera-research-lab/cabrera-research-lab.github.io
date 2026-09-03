export type PropertyId = 'practice' | 'stsi-pro' | 'camp' | 'jost' | 'cabreralab' | 'evidence';

export type Platform = 'django' | 'wix' | 'mighty-networks' | 'open-science';

export type Rubric = 'practice-app' | 'marketing-site' | 'community' | 'open-science';

export type CheckState = 'pass' | 'warn' | 'fail';

export type Pillar = 'seo' | 'geo';

export type Property = {
  id: PropertyId;
  label: string;
  hosts: string[];
  canonicalHost: string;
  fetchUrl: string;
  aliasUrl?: string;
  platform: Platform;
  platformLabel: string;
  rubric: Rubric;
  description: string;
};

export type FetchDoc = {
  url: string;
  finalUrl: string;
  status: number;
  redirected: boolean;
  contentType: string | null;
  xRobotsTag: string | null;
  body: string;
};

export type RawSnapshot = {
  propertyId: PropertyId;
  fetchedAt: string;
  home: FetchDoc | null;
  aliasHome?: FetchDoc | null;
  robots: FetchDoc | null;
  sitemap: FetchDoc | null;
  llms: FetchDoc | null;
};

export type AiBotAccess = 'allow' | 'disallow' | 'unspecified';

export type ParsedPage = {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  h1: string[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: string | null;
  jsonLdTypes: string[];
  hasViewport: boolean;
  textLength: number;
  htmlBytes: number;
  looksLikeWix: boolean;
  looksLikeMightyNetworks: boolean;
  looksLikeAppShell: boolean;
  hasDoi: boolean;
  hasLoginWall: boolean;
};

export type ParsedRobots = {
  sitemapUrls: string[];
  groups: RobotsGroup[];
  aiBots: Record<string, AiBotAccess>;
  googlebot: AiBotAccess;
  disallowsAdmin: boolean;
  disallowsAccounts: boolean;
};

export type RobotsGroup = {
  agents: string[];
  allows: string[];
  disallows: string[];
};

export type ParsedSitemap = {
  kind: 'urlset' | 'index' | 'unknown';
  urlCount: number;
  sampleUrls: string[];
  hasAttemptUrls: boolean;
};

export type ParsedSnapshot = {
  propertyId: PropertyId;
  fetchedAt: string;
  home: ParsedPage | null;
  homeDoc: FetchDoc | null;
  aliasHome: FetchDoc | null;
  robots: ParsedRobots | null;
  robotsDoc: FetchDoc | null;
  sitemap: ParsedSitemap | null;
  sitemapDoc: FetchDoc | null;
  llms: { status: number; body: string; hasSubstance: boolean } | null;
};

export type HealthCheck = {
  id: string;
  name: string;
  detail: string;
  state: CheckState;
  pillar: Pillar;
  weight: number;
};

export type PillarResult = {
  score: number;
  status: string;
  checks: HealthCheck[];
};

export type HealthResult = {
  seo: PillarResult;
  geo: PillarResult;
  overallStatus: string;
};
