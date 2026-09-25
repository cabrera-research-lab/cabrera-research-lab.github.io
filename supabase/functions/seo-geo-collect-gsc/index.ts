/**
 * Authenticated GSC keyword refresh for one SEO/GEO property.
 * Requires secret GSC_SERVICE_ACCOUNT_JSON (service account JSON).
 * Hosts stay in sync with src/apps/seo-geo/lib/properties.ts.
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SITES_URL = 'https://www.googleapis.com/webmasters/v3/sites';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

const GSC_PROPERTIES: { id: string; hosts: string[] }[] = [
  { id: 'practice', hosts: ['practice.stsi.pro', 'stsi.tools', 'www.stsi.tools'] },
  { id: 'stsi-pro', hosts: ['stsi.pro', 'www.stsi.pro'] },
  { id: 'camp', hosts: ['camp.stsi.pro'] },
  { id: 'jost', hosts: ['jost.science', 'www.jost.science'] },
  { id: 'cabreralab', hosts: ['cabreralab.science', 'www.cabreralab.science'] },
  { id: 'evidence', hosts: ['evidence.cabreralab.science'] },
];

type ServiceAccount = { client_email: string; private_key: string };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function base64Url(bytes: Uint8Array | string): string {
  const raw = typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes);
  const b64 = btoa(raw);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function parseServiceAccount(raw: string): ServiceAccount {
  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GSC_SERVICE_ACCOUNT_JSON must include client_email and private_key.');
  }
  return parsed;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const binary = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    binary,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function gscAccessToken(account: ServiceAccount): Promise<string> {
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
  const key = await importPrivateKey(account.private_key);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const body = (await res.json()) as { access_token?: string; error_description?: string; error?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || `Token exchange failed (${res.status})`);
  }
  return body.access_token;
}

function gscDate(daysAgo = 0): string {
  const shifted = new Date(Date.now() - daysAgo * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(shifted);
}

async function listGscSites(accessToken: string): Promise<string[]> {
  const res = await fetch(SITES_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = (await res.json()) as { siteEntry?: { siteUrl: string }[]; error?: { message?: string } };
  if (!res.ok) throw new Error(body.error?.message || `GSC sites.list failed (${res.status})`);
  return (body.siteEntry ?? []).map((entry) => entry.siteUrl);
}

function normalizeSiteKey(url: string): string {
  return url.toLowerCase().replace(/\/$/, '');
}

function resolveGscSites(siteUrls: string[], hosts: string[]): string[] {
  const normalizedHosts = hosts.map((host) => host.toLowerCase());
  const sites = siteUrls.map((raw) => ({ raw, key: normalizeSiteKey(raw) }));
  const chosen: { raw: string; key: string }[] = [];
  const covered = new Set<string>();

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

function pageMatchesHosts(page: string, hosts: string[]): boolean {
  try {
    const hostname = new URL(page).hostname.toLowerCase();
    return hosts.some((host) => hostname === host.toLowerCase());
  } catch {
    return false;
  }
}

type GscRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

async function fetchAllQueryRows(accessToken: string, siteUrl: string, startDate: string, endDate: string) {
  const rows: GscRow[] = [];
  let startRow = 0;
  const rowLimit = 25000;
  for (;;) {
    const res = await fetch(`${SITES_URL}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['date', 'query', 'page'],
        rowLimit,
        startRow,
        dataState: 'all',
        searchType: 'web',
      }),
    });
    const body = (await res.json()) as { rows?: GscRow[]; error?: { message?: string } };
    if (!res.ok) throw new Error(body.error?.message || `GSC searchanalytics.query failed (${res.status})`);
    const batch = body.rows ?? [];
    rows.push(...batch);
    if (batch.length < rowLimit) break;
    startRow += rowLimit;
  }
  return rows;
}

async function supabaseRequest(
  url: string,
  serviceKey: string,
  path: string,
  { method = 'GET', body, prefer }: { method?: string; body?: unknown; prefer?: string } = {},
) {
  const headers: Record<string, string> = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path} failed: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function markConnection(
  url: string,
  serviceKey: string,
  propertyId: string,
  fields: Record<string, unknown>,
) {
  await supabaseRequest(url, serviceKey, 'seo_geo_gsc_connections?on_conflict=property_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      property_id: propertyId,
      updated_at: new Date().toISOString(),
      ...fields,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Use POST' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const gscJson = Deno.env.get('GSC_SERVICE_ACCOUNT_JSON');
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json(500, { error: 'Function is missing Supabase secrets' });
  }

  const auth = req.headers.get('Authorization');
  if (!auth) return json(401, { error: 'Sign in to refresh keywords' });
  const userRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: anonKey },
  });
  if (!userRes.ok) return json(401, { error: 'Sign in to refresh keywords' });

  let requestedId = 'stsi-pro';
  try {
    const body = (await req.json()) as { propertyId?: string };
    if (body?.propertyId) requestedId = body.propertyId;
  } catch {
    // Empty body keeps the stsi.pro default.
  }
  const property = GSC_PROPERTIES.find((item) => item.id === requestedId);
  if (!property) {
    return json(400, {
      error: `Unknown property: ${requestedId}. Expected ${GSC_PROPERTIES.map((item) => item.id).join(', ')}.`,
    });
  }

  if (!gscJson) {
    const message = 'Set Edge Function secret GSC_SERVICE_ACCOUNT_JSON.';
    await markConnection(supabaseUrl, serviceKey, property.id, { status: 'missing', last_error: message });
    return json(500, { error: message });
  }

  try {
    const account = parseServiceAccount(gscJson);
    const accessToken = await gscAccessToken(account);
    const sites = await listGscSites(accessToken);
    const siteUrls = resolveGscSites(sites, property.hosts);
    if (!siteUrls.length) {
      const message =
        `No Search Console property matches ${property.hosts.join(', ')}. ` +
        `Add that site and the service account in Search Console. ` +
        `Sites visible: ${sites.join(', ') || 'none'}.`;
      await markConnection(supabaseUrl, serviceKey, property.id, {
        status: 'missing',
        last_error: message,
        gsc_site_url: null,
      });
      return json(200, { ok: false, status: 'missing' });
    }

    const endDate = gscDate(1);
    const startDate = gscDate(28);
    const mapped = [];
    for (const siteUrl of siteUrls) {
      const rawRows = await fetchAllQueryRows(accessToken, siteUrl, startDate, endDate);
      for (const row of rawRows) {
        const keys = row.keys ?? [];
        const page = keys[2] ?? '';
        if (!pageMatchesHosts(page, property.hosts)) continue;
        mapped.push({
          property_id: property.id,
          date: keys[0] ?? endDate,
          query: keys[1] ?? '',
          page,
          clicks: Math.round(row.clicks ?? 0),
          impressions: Math.round(row.impressions ?? 0),
          ctr: row.ctr ?? 0,
          position: row.position ?? 0,
        });
      }
    }

    const deduped = [...new Map(mapped.map((row) => [`${row.date}\0${row.query}\0${row.page}`, row])).values()];
    await supabaseRequest(
      supabaseUrl,
      serviceKey,
      `seo_geo_query_daily?property_id=eq.${encodeURIComponent(property.id)}&date=gte.${startDate}&date=lte.${endDate}`,
      { method: 'DELETE', prefer: 'return=minimal' },
    );
    const chunkSize = 500;
    for (let i = 0; i < deduped.length; i += chunkSize) {
      const chunk = deduped.slice(i, i + chunkSize);
      await supabaseRequest(
        supabaseUrl,
        serviceKey,
        'seo_geo_query_daily?on_conflict=property_id,date,query,page',
        {
          method: 'POST',
          prefer: 'resolution=merge-duplicates,return=minimal',
          body: chunk,
        },
      );
    }

    await markConnection(supabaseUrl, serviceKey, property.id, {
      gsc_site_url: siteUrls.join(', '),
      status: 'connected',
      last_synced_at: new Date().toISOString(),
      last_error: null,
      last_row_count: deduped.length,
    });

    return json(200, {
      ok: true,
      propertyId: property.id,
      siteUrl: siteUrls.join(', '),
      startDate,
      endDate,
      rows: deduped.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markConnection(supabaseUrl, serviceKey, property.id, { status: 'error', last_error: message });
    return json(500, { error: message });
  }
});
