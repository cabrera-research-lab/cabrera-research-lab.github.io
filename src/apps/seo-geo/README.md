# SEO & GEO

Internal health dashboard for search and generative-engine readiness across STSI public properties.

**Route:** `/seo-geo`

## Code map

| Area | Location |
|------|----------|
| Routes | `routes.tsx` |
| Route helpers | `constants.ts` |
| Portfolio | `pages/PortfolioPage.tsx` |
| Property detail | `pages/PropertyPage.tsx` |
| Keywords tab | `components/KeywordsPanel.tsx` |
| Properties | `lib/properties.ts` |
| Fetch parsers | `lib/parseSnapshot.ts` |
| Scoring (pure) | `lib/healthScore.ts` |
| Supabase API | `lib/snapshotApi.ts` |
| GSC keywords API | `lib/keywordApi.ts` |
| Collector | `../../scripts/collect-seo-geo.mjs` |
| GSC collector | `../../scripts/collect-gsc-queries.mjs` |
| Refresh RPC | `../../supabase/migrations/20260911160000_seo_geo_collect_rpc.sql` |
| Styles | `styles/seo-geo.css` |

## Documentation

- [SEO & GEO guide](../../docs/seo-geo.md)
- [Architecture](../../docs/architecture.md)
