# STSI Apps — Teaming, Mission Moments & SEO/GEO

This repository hosts **three separate web apps** that share a Supabase backend and authentication layer. They ship as a single Vite build deployed to GitHub Pages.

| App | Route | Purpose |
|-----|-------|---------|
| **Teaming (TE∆M)** | `/` | Mission-aligned cadence updates — daily, weekly, monthly, quarterly |
| **Mission Moments** | `/mission-moments` | Cohort QC applet for B2B delivery setup and go-live checks |
| **SEO & GEO** | `/seo-geo` | Search and generative-engine health for STSI public properties |

## Quick start

```bash
npm install
cp .env.example .env   # add Supabase URL + publishable key
npm run dev
```

- **Teaming:** [http://localhost:5173/](http://localhost:5173/)
- **Mission Moments:** [http://localhost:5173/mission-moments](http://localhost:5173/mission-moments)
- **SEO & GEO:** [http://localhost:5173/seo-geo](http://localhost:5173/seo-geo)

Apply database migrations in order from [`supabase/migrations/`](supabase/migrations/).

## Repository layout

```
src/
├── apps/
│   ├── teaming/           # TE∆M cadence PWA
│   ├── mission-moments/   # Cohort QC applet
│   └── seo-geo/           # SEO + GEO health dashboard
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
| [Hosting](docs/hosting.md) | GitHub Pages + Supabase setup |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server (all apps) |
| `npm run build` | Production build (+ `404.html` for GitHub Pages) |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run collect:seo-geo` | Fetch public pages and store SEO/GEO snapshots |

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
- Nightly GitHub Action collector writes `seo_geo_snapshots`

Built from the TE∆MING SYSTEM prototype. Stack: **Vite + React + TypeScript**, **Supabase**, deployed on **GitHub Pages** at [cabrera-research-lab.github.io](https://cabrera-research-lab.github.io/).
