# SEO & GEO Health

Internal QC applet for search-engine and generative-engine readiness across STSI public properties. Lives in TEAMING as a third app next to Teaming and Mission Moments.

**Route:** `/seo-geo`

## Product summary

The dashboard reports **SEO** (classic crawl/index health) and **GEO** (generative-engine crawl and extractability) for six properties. Each property has its own rubric so a login-gated community is not scored like a marketing site.

| Property | Live fetch | Platform | Rubric |
|----------|------------|----------|--------|
| **practice.stsi.pro** | `stsi.tools` (+ alias `practice.stsi.pro`) | Django | Practice app — public story indexable; `/llms.txt` names practice.stsi.pro; `/admin/`, `/accounts/`, and attempt URLs must stay out of the sitemap |
| **stsi.pro** | `stsi.pro` | Wix | Marketing site — primary SEO/GEO surface. Fixes happen in Wix |
| **camp.stsi.pro** | `camp.stsi.pro` | Mighty Networks | Community — score the public landing/join page; member spaces behind login are healthy |
| **jost.science** | `jost.science` | Open science | Web SEO plus scholarly/AI citability |
| **cabreralab.science** | `cabreralab.science` (+ `www`) | Open science | Cabrera Research Lab public science site |
| **evidence.cabreralab.science** | `evidence.cabreralab.science` | Open science | DSRP / O-Theory living evidence compendium |

GEO here means **Generative Engine Optimization** (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, `llms.txt`, extractable HTML, entity JSON-LD) — not visitor geography.

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/seo-geo` | `PortfolioPage` | Six properties with latest SEO + GEO scores |
| `/seo-geo/:propertyId` | `PropertyPage` | Checks, facts, and score history |
| `/seo-geo/stsi-pro?tab=keywords` | Keywords tab | Google Search Console query rankings for stsi.pro |

`propertyId` is one of `practice`, `stsi-pro`, `camp`, `jost`, `cabreralab`, `evidence`.

Route helpers: `src/apps/seo-geo/constants.ts`

## Authentication

Soft gate, same as Mission Moments:

- The shell renders without a session
- Snapshots are empty until sign-in
- Reads require `authenticated` (API + RLS)

Sign in with redirect:

```
/login?next=/seo-geo
```

## How scores are produced

The GitHub Pages app **cannot** crawl third-party domains (CORS). Collection runs server-side.

```
Refresh in /seo-geo  →  RPC seo_geo_collect  →  upsert seo_geo_snapshots (1 row / property / UTC day)
Nightly GitHub Action Collect SEO & GEO          ↗
```

1. `scripts/collect-seo-geo.mjs` (and `seo_geo_collect`) fetch homepage, optional alias, `robots.txt`, sitemap, and `llms.txt`.
2. Raw bodies (truncated) are stored as JSON `payload`.
3. Same-day Refresh **updates** that day's snapshot instead of inserting another history bar.
4. The UI parses with `parseSnapshot.ts` and scores with `healthScore.ts`. Historical rows are re-scored with the current rubric.

### SEO checks (shared, then rubric extras)

HTTP 200, title, meta description, canonical host, H1, viewport, robots.txt, sitemap, Open Graph, homepage indexability.

Practice extras: `/admin/` and `/accounts/` disallowed, no `/attempt/` in the sitemap, `practice.stsi.pro` alias, canonical public name.

Camp: missing sitemap is a warning, not a fail. A join/sign-in gate is healthy.

JOST: ScholarlyArticle/Article schema and DOI signals.

### GEO checks

AI crawler access, `llms.txt`, JSON-LD entity markup, extractable HTML (not an empty JS shell). Open-science and marketing sites fail closed if GPTBot/ClaudeBot/PerplexityBot are blocked.

## Database

| Migration | Purpose |
|-----------|---------|
| `20260903180000_seo_geo_snapshots.sql` | Snapshot table + authenticated SELECT |
| `20260911143000_seo_geo_one_snapshot_per_day.sql` | `snapshot_date` + unique `(property_id, snapshot_date)` so Refresh upserts today |
| `20260911160000_seo_geo_collect_rpc.sql` | Authenticated `seo_geo_collect` RPC (Postgres fetches public pages) |
| `20260918000000_seo_geo_gsc_queries.sql` | GSC connections, target keywords, and daily query rows (stsi.pro first) |

**Table:** `seo_geo_snapshots`

- `property_id` — `practice` \| `stsi-pro` \| `camp` \| `jost` \| `cabreralab` \| `evidence`
- `snapshot_date` — UTC calendar day; unique with `property_id`
- `fetched_at`
- `payload` — raw fetch JSON
- `seo_score` / `geo_score` — optional; the UI always re-scores from `payload`

RLS: `authenticated` can SELECT. Nightly collector writes with the **service role**. Dashboard Refresh uses security-definer RPC `seo_geo_collect` (authenticated only). The publishable key cannot write rows directly.

## Refresh from the dashboard

Signed-in users can click **Refresh** on a property (or **Refresh all**) at `/seo-geo`. That calls RPC `seo_geo_collect`, which fetches live pages and upserts today's row.

Apply `supabase/migrations/20260911160000_seo_geo_collect_rpc.sql` in the SQL editor if the function is missing. Only authenticated TEAMING users can run it.

## Collector

GitHub Actions: [`.github/workflows/seo-geo-collect.yml`](../.github/workflows/seo-geo-collect.yml)

- Nightly at 06:00 UTC
- Manual **Run workflow** on `Collect SEO & GEO` (optional `property_id` input)

Repo secrets (in addition to the existing Vite secrets):

- `SEO_GEO_SUPABASE_SERVICE_ROLE_KEY` — Dashboard → API Keys → secret / service role
- `GSC_SERVICE_ACCOUNT_JSON` — Google Cloud service account JSON (Search Console API, read-only). Required for stsi.pro keywords.

Local:

```bash
SEO_GEO_SUPABASE_SERVICE_ROLE_KEY=... npm run collect:seo-geo
npm run collect:seo-geo -- --property practice
npm run collect:seo-geo -- --dry-run
GSC_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' npm run collect:gsc
npm run collect:gsc -- --dry-run
```

`--dry-run` fetches but does not write.

Apply the snapshot and GSC migrations in the Supabase SQL editor before the first collect.

## Keywords (stsi.pro)

Keyword rankings are **not** part of the health score. They live on the Keywords tab for stsi.pro and come from Google Search Console (queries that already received impressions).

1. Verify the domain `stsi.pro` in [Google Search Console](https://search.google.com/search-console).
2. Create a Google Cloud service account, enable **Search Console API**, and add the service-account email as a user on that GSC property.
3. Store the JSON key as `GSC_SERVICE_ACCOUNT_JSON` (GitHub Actions secret and Edge Function secret `seo-geo-collect-gsc`).
4. Apply `20260918000000_seo_geo_gsc_queries.sql`.
5. Run `npm run collect:gsc` or wait for the nightly GitHub Action. **Refresh keywords** reloads stored rows.
6. Optional in-app live pull: deploy Edge Function `seo-geo-collect-gsc` (`npx supabase functions deploy seo-geo-collect-gsc`) and set secret `GSC_SERVICE_ACCOUNT_JSON`. Or add GitHub secret `SUPABASE_ACCESS_TOKEN` and run workflow **Deploy GSC Edge Function**.

Tables: `seo_geo_gsc_connections`, `seo_geo_target_keywords`, `seo_geo_query_daily`. RLS: authenticated SELECT; collector writes with the service role.

GSC data is 1–3 days behind. Average position is impression-weighted over the last 28 days.

## Code map

| Area | Location |
|------|----------|
| Routes | `src/apps/seo-geo/routes.tsx` |
| Properties | `src/apps/seo-geo/lib/properties.ts` |
| Parsers | `src/apps/seo-geo/lib/parseSnapshot.ts` |
| Scoring | `src/apps/seo-geo/lib/healthScore.ts` |
| API | `src/apps/seo-geo/lib/snapshotApi.ts` |
| Keywords API | `src/apps/seo-geo/lib/keywordApi.ts` |
| Portfolio | `src/apps/seo-geo/pages/PortfolioPage.tsx` |
| Keywords card strip | `src/apps/seo-geo/components/PropertyKeywordsStrip.tsx` |
| Detail | `src/apps/seo-geo/pages/PropertyPage.tsx` |
| Collector | `scripts/collect-seo-geo.mjs` |
| GSC collector | `scripts/collect-gsc-queries.mjs` |
| Refresh RPC | `supabase/migrations/20260911160000_seo_geo_collect_rpc.sql` |
| GSC refresh function | `supabase/functions/seo-geo-collect-gsc/index.ts` |

Do not import Teaming or Mission Moments modules from this app.
