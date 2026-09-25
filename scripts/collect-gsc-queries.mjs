/**
 * Pull Google Search Console query/page rows and store them in Supabase.
 *
 *   node scripts/collect-gsc-queries.mjs
 *   node scripts/collect-gsc-queries.mjs --dry-run
 *   node scripts/collect-gsc-queries.mjs --property practice
 *
 * Hosts stay in sync with src/apps/seo-geo/lib/properties.ts.
 * A parent domain property is reused for subdomains, then page rows are filtered to that host.
 *
 * Env:
 *   VITE_SUPABASE_URL
 *   SEO_GEO_SUPABASE_SERVICE_ROLE_KEY
 *   GSC_SERVICE_ACCOUNT_JSON   (service account JSON string)
 *   GSC_SERVICE_ACCOUNT_FILE   (optional path to the JSON file)
 */
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import {
  fetchAllQueryRows,
  gscAccessToken,
  gscDate,
  listGscSites,
  mapGscRows,
  pageMatchesHosts,
  parseServiceAccount,
  resolveGscSites,
} from './lib/gsc-client.mjs';

const PROPERTIES = [
  { id: 'practice', hosts: ['practice.stsi.pro', 'stsi.tools', 'www.stsi.tools'] },
  { id: 'stsi-pro', hosts: ['stsi.pro', 'www.stsi.pro'] },
  { id: 'camp', hosts: ['camp.stsi.pro'] },
  { id: 'jost', hosts: ['jost.science', 'www.jost.science'] },
  { id: 'cabreralab', hosts: ['cabreralab.science', 'www.cabreralab.science'] },
  { id: 'evidence', hosts: ['evidence.cabreralab.science'] },
];

const dryRun = process.argv.includes('--dry-run');
const propertyFlag = process.argv.indexOf('--property');
const propertyFilter = propertyFlag >= 0 ? process.argv[propertyFlag + 1] : null;

function loadServiceAccount() {
  const file = process.env.GSC_SERVICE_ACCOUNT_FILE;
  const raw = file ? readFileSync(file, 'utf8') : process.env.GSC_SERVICE_ACCOUNT_JSON;
  return parseServiceAccount(raw ?? '');
}

function signJwt(unsigned, privateKey) {
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  return signer.sign(privateKey, 'base64url');
}

async function supabaseRequest(url, serviceKey, path, { method = 'GET', body, prefer } = {}) {
  const headers = {
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
  if (!res.ok) {
    throw new Error(`Supabase ${method} ${path} failed: ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function markConnection(url, serviceKey, propertyId, fields) {
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

async function upsertQueryRows(url, serviceKey, rows) {
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await supabaseRequest(
      url,
      serviceKey,
      'seo_geo_query_daily?on_conflict=property_id,date,query,page',
      {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: chunk,
      },
    );
  }
}

function dedupeRows(rows) {
  const byKey = new Map();
  for (const row of rows) {
    byKey.set(`${row.date}\0${row.query}\0${row.page}`, row);
  }
  return [...byKey.values()];
}

async function replaceQueryWindow(url, serviceKey, propertyId, startDate, endDate, rows) {
  await supabaseRequest(
    url,
    serviceKey,
    `seo_geo_query_daily?property_id=eq.${encodeURIComponent(propertyId)}&date=gte.${startDate}&date=lte.${endDate}`,
    { method: 'DELETE', prefer: 'return=minimal' },
  );
  if (rows.length) await upsertQueryRows(url, serviceKey, rows);
}

async function collectProperty(property, accessToken, sites, { supabaseUrl, serviceKey, rowCache }) {
  const siteUrls = resolveGscSites(sites, property.hosts);
  if (!siteUrls.length) {
    const message =
      `No GSC property matches ${property.hosts.join(', ')}. Add the service account in Search Console. ` +
      `Sites visible: ${sites.join(', ') || 'none'}.`;
    if (!dryRun && supabaseUrl && serviceKey) {
      await markConnection(supabaseUrl, serviceKey, property.id, {
        status: 'missing',
        last_error: message,
        gsc_site_url: null,
      });
    }
    return { skipped: true, message };
  }

  const endDate = gscDate(new Date(), 1);
  const startDate = gscDate(new Date(), 28);
  const mapped = [];
  for (const siteUrl of siteUrls) {
    const cacheKey = `${siteUrl}|${startDate}|${endDate}`;
    if (!rowCache.has(cacheKey)) {
      rowCache.set(cacheKey, await fetchAllQueryRows(accessToken, siteUrl, startDate, endDate));
    }
    mapped.push(...mapGscRows(property.id, rowCache.get(cacheKey)));
  }
  const filtered = dedupeRows(mapped.filter((row) => pageMatchesHosts(row.page, property.hosts)));

  if (!dryRun) {
    await replaceQueryWindow(supabaseUrl, serviceKey, property.id, startDate, endDate, filtered);
    await markConnection(supabaseUrl, serviceKey, property.id, {
      gsc_site_url: siteUrls.join(', '),
      status: 'connected',
      last_synced_at: new Date().toISOString(),
      last_error: null,
      last_row_count: filtered.length,
    });
  }

  return { siteUrl: siteUrls.join(', '), startDate, endDate, rows: filtered.length };
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SEO_GEO_SUPABASE_URL;
  const serviceKey = process.env.SEO_GEO_SUPABASE_SERVICE_ROLE_KEY;

  if (!dryRun && (!supabaseUrl || !serviceKey)) {
    console.error('Set VITE_SUPABASE_URL and SEO_GEO_SUPABASE_SERVICE_ROLE_KEY (or pass --dry-run).');
    process.exit(1);
  }

  const selected = propertyFilter
    ? PROPERTIES.filter((item) => item.id === propertyFilter)
    : PROPERTIES;
  if (propertyFilter && !selected.length) {
    console.error(
      `Unknown GSC property: ${propertyFilter}. Expected practice, stsi-pro, camp, jost, cabreralab, or evidence.`,
    );
    process.exit(1);
  }

  let account;
  try {
    account = loadServiceAccount();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    if (!dryRun && supabaseUrl && serviceKey) {
      for (const property of selected) {
        await markConnection(supabaseUrl, serviceKey, property.id, {
          status: 'missing',
          last_error: message,
        });
      }
    }
    process.exit(1);
  }

  const accessToken = await gscAccessToken(account, signJwt);
  const sites = await listGscSites(accessToken);
  const rowCache = new Map();

  for (const property of selected) {
    console.log(`Collecting GSC queries for ${property.id}…`);
    try {
      const result = await collectProperty(property, accessToken, sites, {
        supabaseUrl,
        serviceKey,
        rowCache,
      });
      if (result.skipped) {
        console.log(`  skipped: ${result.message}`);
        continue;
      }
      console.log(
        `  ${dryRun ? 'dry-run ' : ''}site ${result.siteUrl} · ${result.startDate} → ${result.endDate} · ${result.rows} rows`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  failed: ${message}`);
      if (!dryRun && supabaseUrl && serviceKey) {
        await markConnection(supabaseUrl, serviceKey, property.id, {
          status: 'error',
          last_error: message,
        });
      }
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
