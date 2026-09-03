import { getProperty } from '@/apps/seo-geo/lib/properties';
import { AI_BOTS, hostFromUrl } from '@/apps/seo-geo/lib/parseSnapshot';
import type {
  CheckState,
  HealthCheck,
  HealthResult,
  ParsedSnapshot,
  Pillar,
  PillarResult,
  Property,
} from '@/apps/seo-geo/lib/types';

function check(
  id: string,
  name: string,
  state: CheckState,
  detail: string,
  pillar: Pillar,
  weight = 1,
): HealthCheck {
  return { id, name, detail, state, pillar, weight };
}

function scorePillar(checks: HealthCheck[]): PillarResult {
  const total = checks.reduce((sum, item) => sum + item.weight, 0);
  const earned = checks.reduce((sum, item) => {
    if (item.state === 'pass') return sum + item.weight;
    if (item.state === 'warn') return sum + item.weight * 0.5;
    return sum;
  }, 0);
  const score = total === 0 ? 0 : Math.round((100 * earned) / total);
  const status = score >= 90 ? 'Healthy' : score >= 75 ? 'Watch' : score > 0 ? 'Needs work' : 'No signal';
  return { score, status, checks };
}

function overallStatus(seo: PillarResult, geo: PillarResult): string {
  const worst = Math.min(seo.score, geo.score);
  if (worst >= 90) return 'Healthy';
  if (worst >= 75) return 'Watch';
  return 'Needs work';
}

function titleState(title: string | null): { state: CheckState; detail: string } {
  if (!title) return { state: 'fail', detail: 'No <title> tag on the public homepage.' };
  const length = title.length;
  if (length < 10) return { state: 'warn', detail: `Title is short (${length} chars): “${title}”.` };
  if (length > 70) return { state: 'warn', detail: `Title is long (${length} chars). Aim for 10–60.` };
  return { state: 'pass', detail: `Title (${length} chars): “${title}”.` };
}

function descriptionState(value: string | null): { state: CheckState; detail: string } {
  if (!value) return { state: 'fail', detail: 'No meta description on the public homepage.' };
  const length = value.length;
  if (length < 50) return { state: 'warn', detail: `Description is short (${length} chars).` };
  if (length > 170) return { state: 'warn', detail: `Description is long (${length} chars). Aim for 50–160.` };
  return { state: 'pass', detail: `Description present (${length} chars).` };
}

function botDetail(label: string, access: string | undefined): { state: CheckState; detail: string } {
  if (access === 'disallow') {
    return { state: 'fail', detail: `${label} is disallowed in robots.txt on /. AI engines cannot fetch the public page.` };
  }
  if (access === 'allow') {
    return { state: 'pass', detail: `${label} may fetch the public homepage.` };
  }
  return { state: 'pass', detail: `${label} has no specific rule; it inherits the * group (homepage allowed).` };
}

function seoChecks(property: Property, snapshot: ParsedSnapshot): HealthCheck[] {
  const checks: HealthCheck[] = [];
  const home = snapshot.home;
  const homeDoc = snapshot.homeDoc;
  const rubric = property.rubric;

  if (!homeDoc) {
    checks.push(check('http-home', 'Homepage fetch', 'fail', 'Collector did not store a homepage response.', 'seo', 3));
  } else if (homeDoc.status >= 400) {
    const wall =
      homeDoc.status === 403
        ? ' This looks like a bot/WAF wall. Confirm Googlebot, GPTBot, ClaudeBot, and PerplexityBot are allowed; GitHub Actions IPs may be blocked even when browsers work.'
        : '';
    checks.push(
      check('http-home', 'Homepage fetch', 'fail', `Homepage returned HTTP ${homeDoc.status} (${homeDoc.finalUrl}).${wall}`, 'seo', 3),
    );
  } else {
    checks.push(
      check(
        'http-home',
        'Homepage fetch',
        'pass',
        `HTTP ${homeDoc.status}${homeDoc.redirected ? ` via redirect to ${homeDoc.finalUrl}` : ''} at ${homeDoc.finalUrl}.`,
        'seo',
        3,
      ),
    );
  }

  const title = titleState(home?.title ?? null);
  checks.push(check('title', 'Title tag', title.state, title.detail, 'seo', 2));

  const desc = descriptionState(home?.metaDescription ?? null);
  checks.push(check('meta-description', 'Meta description', desc.state, desc.detail, 'seo', 2));

  if (!home?.canonical) {
    checks.push(check('canonical', 'Canonical URL', 'fail', 'No rel=canonical on the homepage.', 'seo', 2));
  } else {
    const host = hostFromUrl(home.canonical);
    const expected = property.hosts.map((item) => item.replace(/^www\./, ''));
    if (host && expected.includes(host)) {
      const canonicalName =
        host === property.canonicalHost
          ? 'pass'
          : rubric === 'practice-app'
            ? 'warn'
            : 'pass';
      checks.push(
        check(
          'canonical',
          'Canonical URL',
          canonicalName,
          canonicalName === 'warn'
            ? `Canonical is ${home.canonical}. Preferred public name is ${property.canonicalHost}.`
            : `Canonical is ${home.canonical}.`,
          'seo',
          2,
        ),
      );
    } else {
      checks.push(
        check(
          'canonical',
          'Canonical URL',
          'warn',
          `Canonical host ${host ?? home.canonical} is outside ${property.canonicalHost}.`,
          'seo',
          2,
        ),
      );
    }
  }

  if (!home?.h1.length) {
    checks.push(check('h1', 'H1 heading', 'warn', 'No H1 on the public homepage.', 'seo'));
  } else if (home.h1.length === 1) {
    checks.push(check('h1', 'H1 heading', 'pass', `One H1: “${home.h1[0]}”.`, 'seo'));
  } else {
    checks.push(check('h1', 'H1 heading', 'warn', `${home.h1.length} H1 tags. Prefer a single page title.`,'seo'));
  }

  checks.push(
    check(
      'viewport',
      'Viewport meta',
      home?.hasViewport ? 'pass' : 'warn',
      home?.hasViewport ? 'Viewport meta is present (mobile-friendly signal).' : 'No viewport meta tag.',
      'seo',
    ),
  );

  const robotsOk = snapshot.robotsDoc && snapshot.robotsDoc.status < 400;
  checks.push(
    check(
      'robots-txt',
      'robots.txt',
      robotsOk ? 'pass' : 'fail',
      robotsOk
        ? `robots.txt HTTP ${snapshot.robotsDoc!.status}.`
        : `robots.txt missing or error (HTTP ${snapshot.robotsDoc?.status ?? 'n/a'}).`,
      'seo',
      2,
    ),
  );

  const sitemapOk = snapshot.sitemapDoc && snapshot.sitemapDoc.status < 400 && (snapshot.sitemap?.urlCount ?? 0) > 0;
  if (rubric === 'community') {
    checks.push(
      check(
        'sitemap',
        'Sitemap',
        sitemapOk ? 'pass' : 'warn',
        sitemapOk
          ? `Sitemap ${snapshot.sitemap?.kind ?? ''} with ${snapshot.sitemap?.urlCount} URLs.`
          : 'No public sitemap. Acceptable for a login-gated community if the landing page is crawlable.',
        'seo',
      ),
    );
  } else {
    checks.push(
      check(
        'sitemap',
        'Sitemap',
        sitemapOk ? 'pass' : 'fail',
        sitemapOk
          ? `Sitemap ${snapshot.sitemap?.kind ?? ''} with ${snapshot.sitemap?.urlCount} URLs.`
          : `Sitemap missing or empty (HTTP ${snapshot.sitemapDoc?.status ?? 'n/a'}).`,
        'seo',
        2,
      ),
    );
  }

  checks.push(
    check(
      'og-title',
      'Open Graph',
      home?.ogTitle ? 'pass' : 'warn',
      home?.ogTitle ? `og:title is “${home.ogTitle}”.` : 'No og:title. Social and some AI crawlers use it as a fallback title.',
      'seo',
    ),
  );

  const robotsMeta = (home?.robotsMeta ?? homeDoc?.xRobotsTag ?? '').toLowerCase();
  if (robotsMeta.includes('noindex')) {
    checks.push(
      check(
        'indexable',
        'Homepage indexability',
        rubric === 'community' ? 'pass' : 'fail',
        rubric === 'community'
          ? `Homepage is noindex (${home?.robotsMeta || homeDoc?.xRobotsTag}). Fine if Camp is meant to be member-only; public discovery then depends on stsi.pro.`
          : `Homepage is noindex (${home?.robotsMeta || homeDoc?.xRobotsTag}). Search engines will not list the public page.`,
        'seo',
        2,
      ),
    );
  } else {
    checks.push(
      check(
        'indexable',
        'Homepage indexability',
        'pass',
        home?.robotsMeta ? `robots meta: ${home.robotsMeta}.` : 'Homepage is not marked noindex.',
        'seo',
      ),
    );
  }

  if (rubric === 'practice-app') {
    checks.push(
      check(
        'practice-private',
        'Private paths blocked',
        snapshot.robots?.disallowsAdmin && snapshot.robots?.disallowsAccounts ? 'pass' : 'warn',
        snapshot.robots?.disallowsAdmin && snapshot.robots?.disallowsAccounts
          ? 'robots.txt disallows /admin/ and /accounts/ — learner and staff surfaces stay out of the index.'
          : 'robots.txt should disallow /admin/ and /accounts/ so practice accounts are not indexed.',
        'seo',
        2,
      ),
    );
    checks.push(
      check(
        'practice-sitemap-hygiene',
        'Sitemap hygiene',
        snapshot.sitemap?.hasAttemptUrls ? 'fail' : sitemapOk ? 'pass' : 'warn',
        snapshot.sitemap?.hasAttemptUrls
          ? 'Sitemap includes /attempt/ URLs (likely WarmupAttempt rows). Those are user-specific and should not be indexed.'
          : sitemapOk
            ? 'Sampled sitemap URLs do not include attempt paths.'
            : 'Could not verify sitemap contents.',
        'seo',
        2,
      ),
    );
    const alias = snapshot.aliasHome;
    if (alias) {
      checks.push(
        check(
          'practice-alias',
          'practice.stsi.pro alias',
          alias.status < 400 ? 'pass' : 'warn',
          alias.status < 400
            ? `https://practice.stsi.pro/ returned HTTP ${alias.status}.`
            : `https://practice.stsi.pro/ returned HTTP ${alias.status}. Display name is practice.stsi.pro; the alias should resolve.`,
          'seo',
          2,
        ),
      );
    }
    const brandingHost = hostFromUrl(home?.canonical) ?? hostFromUrl(homeDoc?.finalUrl);
    checks.push(
      check(
        'practice-brand',
        'Canonical public name',
        brandingHost === 'practice.stsi.pro' ? 'pass' : 'warn',
        brandingHost === 'practice.stsi.pro'
          ? 'Public name is practice.stsi.pro.'
          : `Live branding still uses ${brandingHost ?? 'stsi.tools'}. Report this property as practice.stsi.pro and move canonicals/sitemaps when ready.`,
        'seo',
      ),
    );
  }

  if (rubric === 'marketing-site') {
    checks.push(
      check(
        'wix-surface',
        'Wix marketing surface',
        home?.looksLikeWix || (home?.textLength ?? 0) > 400 ? 'pass' : 'warn',
        home?.looksLikeWix
          ? 'Page looks like Wix. Fixes go in the Wix editor, not this app.'
          : 'Could not confirm Wix markers; content still parsed from the public HTML.',
        'seo',
      ),
    );
  }

  if (rubric === 'community') {
    checks.push(
      check(
        'community-gate',
        'Community gating',
        'pass',
        home?.hasLoginWall
          ? 'Public page shows a join/sign-in gate. Member spaces should stay out of the index — that is healthy for Camp.'
          : 'No obvious login wall copy. Confirm member spaces are not in a public sitemap.',
        'seo',
      ),
    );
  }

  if (rubric === 'open-science') {
    const scholarly = home?.jsonLdTypes.some((type) =>
      /scholarlyarticle|article|dataset|periodical|publicationissue/i.test(type),
    );
    checks.push(
      check(
        'science-schema',
        'Scholarly schema',
        scholarly ? 'pass' : 'warn',
        scholarly
          ? `JSON-LD types: ${home?.jsonLdTypes.join(', ')}.`
          : 'No ScholarlyArticle / Article / Dataset JSON-LD. Helps Google Scholar and AI citations.',
        'seo',
        2,
      ),
    );
    checks.push(
      check(
        'science-doi',
        'DOI signal',
        home?.hasDoi ? 'pass' : 'warn',
        home?.hasDoi ? 'DOI or doi.org reference found in the HTML.' : 'No DOI found on the homepage. Inner article pages may still have them.',
        'seo',
      ),
    );
  }

  return checks;
}

function geoChecks(property: Property, snapshot: ParsedSnapshot): HealthCheck[] {
  const checks: HealthCheck[] = [];
  const home = snapshot.home;
  const robots = snapshot.robots;
  const rubric = property.rubric;
  const strictAi = rubric === 'open-science' || rubric === 'marketing-site';

  const primaryBots: { id: string; label: string }[] = [
    { id: 'GPTBot', label: 'GPTBot (ChatGPT / SearchGPT)' },
    { id: 'ClaudeBot', label: 'ClaudeBot' },
    { id: 'PerplexityBot', label: 'PerplexityBot' },
    { id: 'Google-Extended', label: 'Google-Extended (Gemini / AI Overviews training)' },
  ];

  for (const bot of primaryBots) {
    const access = robots?.aiBots[bot.id];
    const result = botDetail(bot.label, access);
    const state: CheckState =
      access === 'disallow' ? (strictAi ? 'fail' : 'warn') : result.state;
    checks.push(check(`bot-${bot.id}`, bot.label, state, result.detail, 'geo', bot.id === 'GPTBot' ? 2 : 1));
  }

  const blocked = AI_BOTS.filter((bot) => robots?.aiBots[bot] === 'disallow');
  if (blocked.length) {
    checks.push(
      check(
        'ai-bots-extra',
        'Other AI crawlers',
        strictAi ? 'fail' : 'warn',
        `Also blocked: ${blocked.join(', ')}.`,
        'geo',
      ),
    );
  } else {
    checks.push(
      check(
        'ai-bots-extra',
        'Other AI crawlers',
        'pass',
        'ChatGPT-User, OAI-SearchBot, anthropic-ai, and Perplexity-User are not blocked.',
        'geo',
      ),
    );
  }

  const llms = snapshot.llms;
  if (llms?.hasSubstance) {
    const mentions =
      rubric === 'practice-app'
        ? /practice\.stsi\.pro/i.test(llms.body) && /systems thinking|thinkquery|dsrp/i.test(llms.body)
        : true;
    checks.push(
      check(
        'llms-txt',
        'llms.txt',
        mentions ? 'pass' : 'warn',
        mentions
          ? `llms.txt is live (${llms.body.trim().length} chars).`
          : 'llms.txt exists but does not name practice.stsi.pro or describe systems thinking / DSRP / ThinkQuery.',
        'geo',
        2,
      ),
    );
  } else {
    checks.push(
      check(
        'llms-txt',
        'llms.txt',
        'warn',
        `No useful llms.txt (HTTP ${llms?.status ?? 'n/a'}). Add /llms.txt so AI systems can quote a canonical description.`,
        'geo',
        2,
      ),
    );
  }

  const types = home?.jsonLdTypes ?? [];
  if (types.length) {
    checks.push(
      check(
        'jsonld',
        'Structured data',
        'pass',
        `JSON-LD types: ${types.join(', ')}.`,
        'geo',
        2,
      ),
    );
  } else {
    checks.push(
      check(
        'jsonld',
        'Structured data',
        'warn',
        'No JSON-LD on the homepage. Organization / WebSite (and ScholarlyArticle on JOST) help generative engines ground the entity.',
        'geo',
        2,
      ),
    );
  }

  const org = types.some((type) => /organization|website|periodical/i.test(type));
  checks.push(
    check(
      'jsonld-entity',
      'Entity markup',
      org ? 'pass' : 'warn',
      org
        ? 'Organization or WebSite markup is present.'
        : 'Add Organization / WebSite JSON-LD so the brand is an explicit entity, not just a URL.',
      'geo',
    ),
  );

  const textLength = home?.textLength ?? 0;
  if (home?.looksLikeAppShell) {
    checks.push(
      check(
        'extractable',
        'Extractable HTML',
        'fail',
        'Homepage looks like an empty JS app shell. Generative crawlers that do not execute JS will see almost nothing.',
        'geo',
        3,
      ),
    );
  } else if (textLength >= 400) {
    checks.push(
      check(
        'extractable',
        'Extractable HTML',
        'pass',
        `About ${textLength.toLocaleString()} characters of HTML text. Crawlers can quote the public story without running JavaScript.`,
        'geo',
        2,
      ),
    );
  } else {
    checks.push(
      check(
        'extractable',
        'Extractable HTML',
        rubric === 'community' ? 'warn' : 'fail',
        `Only ${textLength} characters of visible HTML text. Thin or JS-only pages are weak for GEO.`,
        'geo',
        2,
      ),
    );
  }

  return checks;
}

export function scoreStatusClass(score: number | null): 'ready' | 'warn' | 'bad' | 'neutral' {
  if (score == null) return 'neutral';
  if (score >= 90) return 'ready';
  if (score >= 75) return 'warn';
  return 'bad';
}

export function runHealthScore(snapshot: ParsedSnapshot): HealthResult {
  const property = getProperty(snapshot.propertyId);
  const seo = scorePillar(seoChecks(property, snapshot));
  const geo = scorePillar(geoChecks(property, snapshot));
  return { seo, geo, overallStatus: overallStatus(seo, geo) };
}
