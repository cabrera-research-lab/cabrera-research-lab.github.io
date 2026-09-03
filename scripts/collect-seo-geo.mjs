/**
 * Nightly SEO & GEO collector.
 * Fetches public HTML / robots / sitemap / llms.txt and stores raw snapshots in Supabase.
 *
 *   node scripts/collect-seo-geo.mjs
 *   node scripts/collect-seo-geo.mjs --dry-run
 *
 * Env:
 *   VITE_SUPABASE_URL
 *   SEO_GEO_SUPABASE_SERVICE_ROLE_KEY  (service role — never expose to Vite)
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const HTML_LIMIT = 80_000;
const TEXT_LIMIT = 20_000;
const SITEMAP_LIMIT = 80_000;

const PROPERTIES = [
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

const dryRun = process.argv.includes('--dry-run');

async function fetchDoc(url, limit = HTML_LIMIT) {
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

function sitemapUrlsFromRobots(body) {
  return [...body.matchAll(/^sitemap:\s*(\S+)/gim)].map((match) => match[1].trim());
}

async function collectProperty(property) {
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

async function insertSnapshot(url, serviceKey, payload) {
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/seo_geo_snapshots`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      property_id: payload.propertyId,
      fetched_at: payload.fetchedAt,
      payload,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase insert failed for ${payload.propertyId}: ${res.status} ${text}`);
  }
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SEO_GEO_SUPABASE_URL;
  const serviceKey = process.env.SEO_GEO_SUPABASE_SERVICE_ROLE_KEY;

  if (!dryRun && (!supabaseUrl || !serviceKey)) {
    console.error(
      'Set VITE_SUPABASE_URL and SEO_GEO_SUPABASE_SERVICE_ROLE_KEY (or pass --dry-run).',
    );
    process.exit(1);
  }

  const results = [];
  for (const property of PROPERTIES) {
    console.log(`Collecting ${property.id}…`);
    const payload = await collectProperty(property);
    results.push({
      id: property.id,
      home: payload.home?.status,
      alias: payload.aliasHome?.status ?? null,
      robots: payload.robots?.status,
      sitemap: payload.sitemap?.status,
      llms: payload.llms?.status,
    });
    if (!dryRun) {
      await insertSnapshot(supabaseUrl, serviceKey, payload);
      console.log(`  stored ${property.id}`);
    } else {
      console.log(`  dry-run ${property.id}`, {
        home: payload.home?.status,
        robots: payload.robots?.status,
        sitemap: payload.sitemap?.status,
        llms: payload.llms?.status,
      });
    }
  }

  console.log('Done.', results);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
