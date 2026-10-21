# STSI Apps — Teaming, Mission Moments & SEO/GEO

This repository hosts separate web apps that share a Supabase backend and authentication layer. They ship as a single Vite build deployed to GitHub Pages.

| App | Route | Purpose |
|-----|-------|---------|
| **Teaming (TE∆M)** | `/` | Mission-aligned cadence updates — daily, weekly, monthly, quarterly |
| **Mission Moments** | `/mission-moments` | Cohort QC applet for B2B delivery setup and go-live checks |
| **SEO & GEO** | `/seo-geo` | Search and generative-engine health for STSI public properties |
| **TQ enhancement** | `/tq-enhancement` | Side-by-side PST-SA variant review with a private copy per member |

## Quick start

```bash
npm install
cp .env.example .env   # add Supabase URL + publishable key
npm run dev
```

- **Teaming:** [http://localhost:5173/](http://localhost:5173/)
- **Mission Moments:** [http://localhost:5173/mission-moments](http://localhost:5173/mission-moments)
- **SEO & GEO:** [http://localhost:5173/seo-geo](http://localhost:5173/seo-geo)
- **TQ enhancement:** [http://localhost:5173/tq-enhancement](http://localhost:5173/tq-enhancement)

Apply database migrations in order from [`supabase/migrations/`](supabase/migrations/).

## Repository layout

```
src/
├── apps/
│   ├── teaming/           # TE∆M cadence PWA
│   ├── mission-moments/   # Cohort QC applet
│   ├── seo-geo/           # SEO + GEO health dashboard
│   └── tq-enhancement/    # PST-SA variant review
├── shared/
│   ├── auth/              # Login, session, protected routes
│   └── lib/               # Supabase client, auth API
├── App.tsx                # Root router (composes all apps)
└── main.tsx
```

See [`docs/architecture.md`](docs/architecture.md) for the full separation guide.

## Documentation

| Doc | Scope |
|-----|-------|
| [Architecture](docs/architecture.md) | How the apps are separated and what they share |
| [Teaming features](docs/features.md) | Teaming feature inventory & backlog |
| [Cadence spec](docs/cadence-spec.md) | Teaming cadence questions and limits |
| [Mission Moments](docs/mission-moments.md) | Cohort QC workflow, routes, and schema |
| [SEO & GEO](docs/seo-geo.md) | Property rubrics, collector, and scoring |
| [TQ enhancement](docs/tq-enhancement.md) | Variant review, private copies, and reviewer access |
| [Hosting](docs/hosting.md) | GitHub Pages + Supabase setup |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server (all apps) |
| `npm run build` | Production build (+ `404.html` for GitHub Pages) |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run collect:seo-geo` | Fetch public pages and store SEO/GEO snapshots |
| `npm run collect:gsc` | Fetch Google Search Console queries for every property the service account can read |

## Teaming (TE∆M)

Progressive web app for managing Mission-aligned updates across **Daily**, **Weekly**, **Monthly**, and **Quarterly** cadences — with team reports, Mission ratings, and cascading priorities.

- Email/password authentication with team onboarding
- Cadence updates with character-band guidance
- Org-wide weekly priorities and team-scoped monthly/quarterly targets
- Realtime team report refresh via Supabase

## Mission Moments

Internal QC applet for reviewing B2B cohort setup before go-live — belt paths, email domains, product promises, and final checklists.

- Route: `/mission-moments` (legacy `/b2b-qc` redirects here)
- Soft auth gate: browse prompts sign-in; saving requires a session
- Activity log with snapshots for audit trail

## SEO & GEO

Internal QC for search and generative-engine health on **practice.stsi.pro** (`stsi.tools`), **stsi.pro**, **camp.stsi.pro**, **jost.science**, **cabreralab.science**, and **evidence.cabreralab.science**.

- Route: `/seo-geo`
- Soft auth gate: snapshots require sign-in
- **Refresh** on each property (and Refresh all) re-fetches live pages; same-day runs update today’s bars
- **Keywords** tab on stsi.pro shows Google Search Console query rankings (separate from health scores)
- Nightly GitHub Action still writes `seo_geo_snapshots` and, when configured, GSC query rows

## TQ enhancement

Internal review of the PST-SA parallel item bank. Each question shows the original plus drafts A, B, and C, including figures.

- Route: `/tq-enhancement`
- Sign-in required to read or save
- Each member marks every variant good or not, comments on that variant, and can add more variants. They edit only their own copy.
- All copies: `/tq-enhancement/copies`, visible to the reviewer account only

Built from the TE∆MING SYSTEM prototype. Stack: **Vite + React + TypeScript**, **Supabase**, deployed on **GitHub Pages** at [cabrera-research-lab.github.io](https://cabrera-research-lab.github.io/).
