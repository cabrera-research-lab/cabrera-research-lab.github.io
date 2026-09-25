/**
 * Google Search Console client (service account JWT).
 * Used by scripts/collect-gsc-queries.mjs. Keep free of npm deps.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SITES_URL = 'https://www.googleapis.com/webmasters/v3/sites';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function base64Url(value) {
  const buf = typeof value === 'string' ? Buffer.from(value) : Buffer.from(value);
  return buf.toString('base64url');
}

export function parseServiceAccount(raw) {
  if (!raw || !raw.trim()) {
    throw new Error('GSC_SERVICE_ACCOUNT_JSON is empty.');
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('GSC_SERVICE_ACCOUNT_JSON is not valid JSON.');
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GSC_SERVICE_ACCOUNT_JSON must include client_email and private_key.');
  }
  return parsed;
}

export async function gscAccessToken(account, signJwt) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signature = await signJwt(unsigned, account.private_key);
  const assertion = `${unsigned}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || `Token exchange failed (${res.status})`);
  }
  return body.access_token;
}

export async function listGscSites(accessToken) {
  const res = await fetch(SITES_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error?.message || `GSC sites.list failed (${res.status})`);
  }
  return (body.siteEntry ?? []).map((entry) => entry.siteUrl);
}

function normalizeSiteKey(url) {
  return url.toLowerCase().replace(/\/$/, '');
}

/**
 * Search Console sites that cover these hosts.
 * Exact domain or URL-prefix properties win. A parent domain property
 * (sc-domain:stsi.pro for camp.stsi.pro) is used only when that host has no exact property.
 * Callers must filter page rows with pageMatchesHosts so subdomain traffic stays on its own property.
 */
export function resolveGscSites(siteUrls, hosts) {
  const normalizedHosts = hosts.map((host) => host.toLowerCase());
  const sites = siteUrls.map((raw) => ({ raw, key: normalizeSiteKey(raw) }));
  const chosen = [];
  const covered = new Set();

  for (const host of normalizedHosts) {
    const domain = sites.find((site) => site.key === `sc-domain:${host}`);
    const prefix = sites.find((site) => site.key === `https://${host}` || site.key === `http://${host}`);
    const match = domain || prefix;
    if (!match) continue;
    covered.add(host);
    if (!chosen.some((item) => item.key === match.key)) chosen.push(match);
  }

  for (const host of normalizedHosts) {
    if (covered.has(host)) continue;
    const parent = sites
      .filter((site) => site.key.startsWith('sc-domain:'))
      .map((site) => ({ ...site, domain: site.key.slice('sc-domain:'.length) }))
      .filter((site) => host.endsWith(`.${site.domain}`))
      .sort((a, b) => b.domain.length - a.domain.length)[0];
    if (parent && !chosen.some((item) => item.key === parent.key)) chosen.push(parent);
  }

  return chosen.map((site) => site.raw);
}

export function pageMatchesHosts(page, hosts) {
  try {
    const hostname = new URL(page).hostname.toLowerCase();
    return hosts.some((host) => hostname === host.toLowerCase());
  } catch {
    return false;
  }
}

export function pickSiteUrl(siteUrls, host) {
  const hosts = Array.isArray(host) ? host : [host];
  return resolveGscSites(siteUrls, hosts)[0] ?? null;
}

export async function querySearchAnalytics(accessToken, siteUrl, requestBody) {
  const url = `${SITES_URL}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error?.message || `GSC searchanalytics.query failed (${res.status})`);
  }
  return body.rows ?? [];
}

export async function fetchAllQueryRows(accessToken, siteUrl, startDate, endDate) {
  const rows = [];
  let startRow = 0;
  const rowLimit = 25000;
  for (;;) {
    const batch = await querySearchAnalytics(accessToken, siteUrl, {
      startDate,
      endDate,
      dimensions: ['date', 'query', 'page'],
      rowLimit,
      startRow,
      dataState: 'all',
      searchType: 'web',
    });
    rows.push(...batch);
    if (batch.length < rowLimit) break;
    startRow += rowLimit;
  }
  return rows;
}

export function gscDate(date, daysAgo = 0) {
  const shifted = new Date(date.getTime() - daysAgo * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(shifted);
}

export function mapGscRows(propertyId, rows) {
  return rows.map((row) => {
    const keys = row.keys ?? [];
    return {
      property_id: propertyId,
      date: keys[0] ?? gscDate(new Date()),
      query: keys[1] ?? '',
      page: keys[2] ?? '',
      clicks: Math.round(row.clicks ?? 0),
      impressions: Math.round(row.impressions ?? 0),
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    };
  });
}
