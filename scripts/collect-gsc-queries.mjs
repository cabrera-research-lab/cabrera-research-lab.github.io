/**
 * Pull Google Search Console query/page rows for stsi.pro and store them in Supabase.
 *
 *   node scripts/collect-gsc-queries.mjs
 *   node scripts/collect-gsc-queries.mjs --dry-run
 *   node scripts/collect-gsc-queries.mjs --property stsi-pro
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
  parseServiceAccount,
  pickSiteUrl,
} from './lib/gsc-client.mjs';

const PROPERTIES = [
  {
    id: 'stsi-pro',
    host: 'stsi.pro',
  },
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

async function collectProperty(property, accessToken, { supabaseUrl, serviceKey }) {
  const sites = await listGscSites(accessToken);
  const siteUrl = pickSiteUrl(sites, property.host);
  if (!siteUrl) {
    throw new Error(
      `No GSC property matches ${property.host}. Add the service account to Search Console ` +
        `(domain ${property.host} or https://${property.host}/). Sites visible: ${sites.join(', ') || 'none'}.`,
    );
  }

  const endDate = gscDate(new Date(), 1);
  const startDate = gscDate(new Date(), 28);
  const rawRows = await fetchAllQueryRows(accessToken, siteUrl, startDate, endDate);
  const mapped = mapGscRows(property.id, rawRows);

  if (!dryRun) {
    await upsertQueryRows(supabaseUrl, serviceKey, mapped);
    await markConnection(supabaseUrl, serviceKey, property.id, {
      gsc_site_url: siteUrl,
      status: 'connected',
      last_synced_at: new Date().toISOString(),
      last_error: null,
      last_row_count: mapped.length,
    });
  }

  return { siteUrl, startDate, endDate, rows: mapped.length };
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
    console.error(`Unknown GSC property: ${propertyFilter}. v1 supports stsi-pro only.`);
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

  for (const property of selected) {
    console.log(`Collecting GSC queries for ${property.id}…`);
    try {
      const result = await collectProperty(property, accessToken, { supabaseUrl, serviceKey });
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
