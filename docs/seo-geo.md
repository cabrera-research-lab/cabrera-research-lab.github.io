# SEO & GEO Health

Internal QC applet for search-engine and generative-engine readiness across STSI public properties. Lives in TEAMING as a third app next to Teaming and Mission Moments.

**Route:** `/seo-geo`

## Product summary

The dashboard reports **SEO** (classic crawl/index health) and **GEO** (generative-engine crawl and extractability) for four properties. Each property has its own rubric so a login-gated community is not scored like a marketing site.

| Property | Live fetch | Platform | Rubric |
|----------|------------|----------|--------|
| **practice.stsi.pro** | `stsi.tools` (+ alias `practice.stsi.pro`) | Django | Practice app — public story indexable; `/admin/`, `/accounts/`, and attempt URLs must stay out of the sitemap |
| **stsi.pro** | `stsi.pro` | Wix | Marketing site — primary SEO/GEO surface. Fixes happen in Wix |
| **camp.stsi.pro** | `camp.stsi.pro` | Mighty Networks | Community — score the public landing/join page; member spaces behind login are healthy |
| **jost.science** | `jost.science` | Open science | Web SEO plus scholarly/AI citability |

GEO here means **Generative Engine Optimization** (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, `llms.txt`, extractable HTML, entity JSON-LD) — not visitor geography.

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/seo-geo` | `PortfolioPage` | Four properties with latest SEO + GEO scores |
| `/seo-geo/:propertyId` | `PropertyPage` | Checks, facts, and score history |

`propertyId` is one of `practice`, `stsi-pro`, `camp`, `jost`.

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

The GitHub Pages app **cannot** crawl third-party domains (CORS). Collection is a scheduled GitHub Action.

```
Collect SEO & GEO workflow  →  seo_geo_snapshots  →  dashboard re-scores on read
```

1. `scripts/collect-seo-geo.mjs` fetches homepage, optional alias, `robots.txt`, sitemap, and `llms.txt`.
2. Raw bodies (truncated) are stored as JSON `payload`.
3. The UI parses with `parseSnapshot.ts` and scores with `healthScore.ts` (no Supabase import). Historical rows are re-scored with the current rubric.

### SEO checks (shared, then rubric extras)

HTTP 200, title, meta description, canonical host, H1, viewport, robots.txt, sitemap, Open Graph, homepage indexability.

Practice extras: `/admin/` and `/accounts/` disallowed, no `/attempt/` in the sitemap, `practice.stsi.pro` alias, canonical public name.

Camp: missing sitemap is a warning, not a fail. A join/sign-in gate is healthy.

JOST: ScholarlyArticle/Article schema and DOI signals.

### GEO checks

AI crawler access, `llms.txt`, JSON-LD entity markup, extractable HTML (not an empty JS shell). JOST and stsi.pro fail closed if GPTBot/ClaudeBot/PerplexityBot are blocked.

## Database

| Migration | Purpose |
|-----------|---------|
| `20260903180000_seo_geo_snapshots.sql` | Snapshot table + authenticated SELECT |

**Table:** `seo_geo_snapshots`

- `property_id` — `practice` \| `stsi-pro` \| `camp` \| `jost`
- `fetched_at`
- `payload` — raw fetch JSON
- `seo_score` / `geo_score` — optional; the UI always re-scores from `payload`

RLS: `authenticated` can SELECT. Inserts use the Supabase **service role** from the collector (bypasses RLS). The publishable key cannot write.

## Collector

GitHub Actions: [`.github/workflows/seo-geo-collect.yml`](../.github/workflows/seo-geo-collect.yml)

- Nightly at 06:00 UTC
- Manual **Run workflow** on `Collect SEO & GEO`

Repo secret (in addition to the existing Vite secrets):

- `SEO_GEO_SUPABASE_SERVICE_ROLE_KEY` — Dashboard → API Keys → secret / service role

Local:

```bash
SEO_GEO_SUPABASE_SERVICE_ROLE_KEY=... npm run collect:seo-geo
npm run collect:seo-geo -- --dry-run
```

`--dry-run` fetches but does not write.

Apply the migration in the Supabase SQL editor before the first collect.

## Code map

| Area | Location |
|------|----------|
| Routes | `src/apps/seo-geo/routes.tsx` |
| Properties | `src/apps/seo-geo/lib/properties.ts` |
| Parsers | `src/apps/seo-geo/lib/parseSnapshot.ts` |
| Scoring | `src/apps/seo-geo/lib/healthScore.ts` |
| API | `src/apps/seo-geo/lib/snapshotApi.ts` |
| Portfolio | `src/apps/seo-geo/pages/PortfolioPage.tsx` |
| Detail | `src/apps/seo-geo/pages/PropertyPage.tsx` |
| Collector | `scripts/collect-seo-geo.mjs` |

Do not import Teaming or Mission Moments modules from this app.
