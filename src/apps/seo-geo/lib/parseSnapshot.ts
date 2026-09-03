import type {
  AiBotAccess,
  FetchDoc,
  ParsedPage,
  ParsedRobots,
  ParsedSitemap,
  ParsedSnapshot,
  PropertyId,
  RawSnapshot,
  RobotsGroup,
} from '@/apps/seo-geo/lib/types';

export const AI_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
] as const;

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i');
  return tag.match(re)?.[1] ?? null;
}

function metaBy(html: string, key: 'name' | 'property', value: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const ident = attr(tag, key);
    if (ident && ident.toLowerCase() === value.toLowerCase()) {
      return attr(tag, 'content');
    }
  }
  return null;
}

function collectJsonLdTypes(value: unknown, into: Set<string>): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdTypes(item, into);
    return;
  }
  if (typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  const type = record['@type'];
  if (typeof type === 'string') into.add(type);
  else if (Array.isArray(type)) {
    for (const item of type) if (typeof item === 'string') into.add(item);
  }
  collectJsonLdTypes(record['@graph'], into);
}

function parsePage(html: string): ParsedPage {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ?? null;
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) =>
    match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  ).filter(Boolean);
  const jsonLdTypes = new Set<string>();
  const jsonLdRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonMatch: RegExpExecArray | null;
  while ((jsonMatch = jsonLdRe.exec(html))) {
    try {
      collectJsonLdTypes(JSON.parse(jsonMatch[1].trim()), jsonLdTypes);
    } catch {
      /* ignore broken JSON-LD */
    }
  }
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const canonicalTag = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0];
  return {
    title,
    metaDescription: metaBy(html, 'name', 'description'),
    canonical: canonicalTag ? attr(canonicalTag, 'href') : null,
    robotsMeta: metaBy(html, 'name', 'robots'),
    h1,
    ogTitle: metaBy(html, 'property', 'og:title'),
    ogDescription: metaBy(html, 'property', 'og:description'),
    ogImage: metaBy(html, 'property', 'og:image'),
    twitterCard: metaBy(html, 'name', 'twitter:card'),
    jsonLdTypes: [...jsonLdTypes],
    hasViewport: metaBy(html, 'name', 'viewport') != null,
    textLength: stripped.length,
    htmlBytes: html.length,
    looksLikeWix: /wixstatic|wix\.com|_wixcss|wix-thunderbolt/i.test(html),
    looksLikeMightyNetworks: /mightynetworks|mighty.?network|mn\.co/i.test(html),
    looksLikeAppShell:
      /<div[^>]+id=["']root["'][^>]*>\s*<\/div>/i.test(html) && stripped.length < 400,
    hasDoi: /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i.test(html) || /doi\.org\//i.test(html),
    hasLoginWall: /\b(sign in|log in|join now|create an account|member login)\b/i.test(stripped),
  };
}

function parseRobotsGroups(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let agents: string[] = [];
  let allows: string[] = [];
  let disallows: string[] = [];
  let sawRule = false;

  const flush = () => {
    if (!agents.length) return;
    groups.push({ agents, allows, disallows });
    agents = [];
    allows = [];
    disallows = [];
    sawRule = false;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const ua = line.match(/^user-agent:\s*(.+)$/i);
    if (ua) {
      if (sawRule) flush();
      agents.push(ua[1].trim());
      continue;
    }
    const allow = line.match(/^allow:\s*(.*)$/i);
    if (allow) {
      allows.push(allow[1].trim() || '/');
      sawRule = true;
      continue;
    }
    const disallow = line.match(/^disallow:\s*(.*)$/i);
    if (disallow) {
      disallows.push(disallow[1].trim());
      sawRule = true;
    }
  }
  flush();
  return groups;
}

function ruleMatches(rule: string, path: string): boolean {
  if (!rule) return false;
  const prefix = rule.endsWith('$') ? rule.slice(0, -1) : rule;
  if (rule.endsWith('$')) return path === prefix;
  return path.startsWith(prefix);
}

function accessFor(groups: RobotsGroup[], agent: string, path = '/'): AiBotAccess {
  const specific = groups.filter((group) =>
    group.agents.some((item) => item.toLowerCase() === agent.toLowerCase()),
  );
  const wildcard = groups.filter((group) => group.agents.some((item) => item === '*'));
  const chosen = specific.length ? specific : wildcard;
  if (!chosen.length) return 'unspecified';

  let best: { length: number; type: 'allow' | 'disallow' } | null = null;
  for (const group of chosen) {
    for (const allow of group.allows) {
      if (!ruleMatches(allow, path)) continue;
      if (!best || allow.length > best.length || (allow.length === best.length && best.type === 'disallow')) {
        best = { length: allow.length, type: 'allow' };
      }
    }
    for (const disallow of group.disallows) {
      if (!ruleMatches(disallow, path)) continue;
      if (!best || disallow.length > best.length) {
        best = { length: disallow.length, type: 'disallow' };
      }
    }
  }
  if (!best) return 'allow';
  return best.type === 'disallow' ? 'disallow' : 'allow';
}

export function parseRobots(text: string): ParsedRobots {
  const groups = parseRobotsGroups(text);
  const sitemapUrls = [...text.matchAll(/^sitemap:\s*(\S+)/gim)].map((match) => match[1].trim());
  const aiBots = Object.fromEntries(
    AI_BOTS.map((bot) => [bot, accessFor(groups, bot)]),
  ) as Record<string, AiBotAccess>;
  const star = accessFor(groups, '*', '/admin/');
  return {
    sitemapUrls,
    groups,
    aiBots,
    googlebot: accessFor(groups, 'Googlebot'),
    disallowsAdmin:
      accessFor(groups, '*', '/admin/') === 'disallow' ||
      accessFor(groups, '*', '/admin') === 'disallow' ||
      star === 'disallow',
    disallowsAccounts:
      accessFor(groups, '*', '/accounts/') === 'disallow' ||
      accessFor(groups, '*', '/accounts/login/') === 'disallow',
  };
}

export function parseSitemap(xml: string): ParsedSitemap {
  const locs = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) => match[1].trim());
  const kind = /<sitemapindex[\s>]/i.test(xml)
    ? 'index'
    : /<urlset[\s>]/i.test(xml)
      ? 'urlset'
      : 'unknown';
  return {
    kind,
    urlCount: locs.length,
    sampleUrls: locs.slice(0, 25),
    hasAttemptUrls: locs.some((url) => /\/attempt\/?/i.test(url) || /warmupattempt/i.test(url)),
  };
}

function isRawSnapshot(value: unknown): value is RawSnapshot {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.propertyId === 'string' && typeof record.fetchedAt === 'string';
}

function asDoc(value: unknown): FetchDoc | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<FetchDoc>;
  if (typeof record.url !== 'string' || typeof record.status !== 'number') return null;
  return {
    url: record.url,
    finalUrl: typeof record.finalUrl === 'string' ? record.finalUrl : record.url,
    status: record.status,
    redirected: Boolean(record.redirected),
    contentType: typeof record.contentType === 'string' ? record.contentType : null,
    xRobotsTag: typeof record.xRobotsTag === 'string' ? record.xRobotsTag : null,
    body: typeof record.body === 'string' ? record.body : '',
  };
}

export function parseRawSnapshot(raw: unknown, fallbackId?: PropertyId): ParsedSnapshot | null {
  if (!isRawSnapshot(raw) && !(raw && typeof raw === 'object')) return null;
  const record = raw as RawSnapshot;
  const propertyId = (record.propertyId ?? fallbackId) as PropertyId | undefined;
  if (!propertyId) return null;
  const homeDoc = asDoc(record.home);
  const robotsDoc = asDoc(record.robots);
  const sitemapDoc = asDoc(record.sitemap);
  const llmsDoc = asDoc(record.llms);
  return {
    propertyId,
    fetchedAt: record.fetchedAt,
    home: homeDoc && homeDoc.status < 400 ? parsePage(homeDoc.body) : homeDoc ? parsePage(homeDoc.body) : null,
    homeDoc,
    aliasHome: asDoc(record.aliasHome),
    robots: robotsDoc && robotsDoc.status < 400 ? parseRobots(robotsDoc.body) : null,
    robotsDoc,
    sitemap: sitemapDoc && sitemapDoc.status < 400 ? parseSitemap(sitemapDoc.body) : null,
    sitemapDoc,
    llms: llmsDoc
      ? {
          status: llmsDoc.status,
          body: llmsDoc.body,
          hasSubstance: llmsDoc.status < 400 && llmsDoc.body.trim().length > 40,
        }
      : null,
  };
}

export function hostFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
