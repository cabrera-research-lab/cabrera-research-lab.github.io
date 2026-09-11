/**
 * Authenticated refresh of one (or all) SEO/GEO properties.
 * Fetches public pages server-side and upserts today's snapshot.
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const HTML_LIMIT = 80_000;
const TEXT_LIMIT = 20_000;
const SITEMAP_LIMIT = 80_000;

type PropertySpec = {
  id: string;
  home: string;
  aliasHome?: string;
  robots: string;
  sitemap: string;
  llms: string;
};

const PROPERTIES: PropertySpec[] = [
  {
    id: 'practice',
    home: 'https://stsi.tools/',
    aliasHome: 'https://practice.stsi.pro/',
    robots: 'https://stsi.tools/robots.txt',
    sitemap: 'https://stsi.tools/sitemap.xml',
    llms: 'https://stsi.tools/llms.txt',
  },
  {
    id: 'stsi-pro',
    home: 'https://stsi.pro/',
    robots: 'https://stsi.pro/robots.txt',
    sitemap: 'https://stsi.pro/sitemap.xml',
    llms: 'https://stsi.pro/llms.txt',
  },
  {
    id: 'camp',
    home: 'https://camp.stsi.pro/',
    robots: 'https://camp.stsi.pro/robots.txt',
    sitemap: 'https://camp.stsi.pro/sitemap.xml',
    llms: 'https://camp.stsi.pro/llms.txt',
  },
  {
    id: 'jost',
    home: 'https://jost.science/',
    robots: 'https://jost.science/robots.txt',
    sitemap: 'https://jost.science/sitemap.xml',
    llms: 'https://jost.science/llms.txt',
  },
  {
    id: 'cabreralab',
    home: 'https://cabreralab.science/',
    aliasHome: 'https://www.cabreralab.science/',
    robots: 'https://cabreralab.science/robots.txt',
    sitemap: 'https://cabreralab.science/sitemap.xml',
    llms: 'https://cabreralab.science/llms.txt',
  },
  {
    id: 'evidence',
    home: 'https://evidence.cabreralab.science/',
    robots: 'https://evidence.cabreralab.science/robots.txt',
    sitemap: 'https://evidence.cabreralab.science/sitemap.xml',
    llms: 'https://evidence.cabreralab.science/llms.txt',
  },
];

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchDoc(url: string, limit = HTML_LIMIT) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(25000),
    });
    const body = await res.text();
    return {
      url,
      finalUrl: res.url,
      status: res.status,
      redirected: res.redirected || res.url !== url,
      contentType: res.headers.get('content-type'),
      xRobotsTag: res.headers.get('x-robots-tag'),
      body: body.slice(0, limit),
    };
  } catch (err) {
    return {
      url,
      finalUrl: url,
      status: 0,
      redirected: false,
      contentType: null,
      xRobotsTag: null,
      body: '',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function sitemapUrlsFromRobots(body: string) {
  return [...body.matchAll(/^sitemap:\s*(\S+)/gim)].map((match) => match[1].trim());
}

async function collectProperty(property: PropertySpec) {
  const [home, aliasHome, robots, llms] = await Promise.all([
    fetchDoc(property.home),
    property.aliasHome ? fetchDoc(property.aliasHome) : Promise.resolve(null),
    fetchDoc(property.robots, TEXT_LIMIT),
    fetchDoc(property.llms, TEXT_LIMIT),
  ]);

  let sitemap = await fetchDoc(property.sitemap, SITEMAP_LIMIT);
  if (sitemap.status >= 400 && robots?.body) {
    const listed = sitemapUrlsFromRobots(robots.body);
    if (listed[0]) sitemap = await fetchDoc(listed[0], SITEMAP_LIMIT);
  }

  return {
    propertyId: property.id,
    fetchedAt: new Date().toISOString(),
    home,
    aliasHome,
    robots,
    sitemap,
    llms,
  };
}

async function upsertSnapshot(url: string, serviceKey: string, payload: { propertyId: string; fetchedAt: string }) {
  const snapshotDate = payload.fetchedAt.slice(0, 10);
  const res = await fetch(
    `${url.replace(/\/$/, '')}/rest/v1/seo_geo_snapshots?on_conflict=property_id,snapshot_date`,
    {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        property_id: payload.propertyId,
        fetched_at: payload.fetchedAt,
        snapshot_date: snapshotDate,
        payload,
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert failed for ${payload.propertyId}: ${res.status} ${text}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Use POST' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json(500, { error: 'Function is missing Supabase secrets' });
  }

  const auth = req.headers.get('Authorization');
  if (!auth) return json(401, { error: 'Sign in to refresh scores' });

  const userRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: anonKey },
  });
  if (!userRes.ok) return json(401, { error: 'Sign in to refresh scores' });

  let propertyId = 'all';
  try {
    const body = (await req.json()) as { propertyId?: string };
    if (typeof body?.propertyId === 'string' && body.propertyId.trim()) {
      propertyId = body.propertyId.trim();
    }
  } catch {
    /* empty body is refresh-all */
  }

  const selected =
    propertyId === 'all'
      ? PROPERTIES
      : PROPERTIES.filter((item) => item.id === propertyId);

  if (!selected.length) {
    return json(400, { error: `Unknown property: ${propertyId}` });
  }

  const results = [];
  try {
    for (const property of selected) {
      const payload = await collectProperty(property);
      await upsertSnapshot(supabaseUrl, serviceKey, payload);
      results.push({
        id: property.id,
        home: payload.home?.status,
        sitemap: payload.sitemap?.status,
        llms: payload.llms?.status,
      });
    }
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : String(err) });
  }

  return json(200, { ok: true, results });
});
