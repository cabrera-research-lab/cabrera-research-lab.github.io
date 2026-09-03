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
| Properties | `lib/properties.ts` |
| Fetch parsers | `lib/parseSnapshot.ts` |
| Scoring (pure) | `lib/healthScore.ts` |
| Supabase API | `lib/snapshotApi.ts` |
| Collector | `scripts/collect-seo-geo.mjs` |
| Styles | `styles/seo-geo.css` |

## Documentation

- [SEO & GEO guide](../../docs/seo-geo.md)
- [Architecture](../../docs/architecture.md)
