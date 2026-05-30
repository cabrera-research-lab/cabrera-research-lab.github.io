# Teaming (TE∆M)

Progressive web app for managing Mission-aligned updates across **Daily**, **Weekly**, **Monthly**, and **Quarterly** cadences — with team reports, Mission ratings, and cascading priorities.

Built from the TE∆MING SYSTEM prototype. Stack: **Vite + React + TypeScript**, **Supabase**, deployed on **GitHub Pages** at [cabrera-research-lab.github.io](https://cabrera-research-lab.github.io/).

## Quick start

```bash
npm install
cp .env.example .env   # add Supabase URL + publishable key (sb_publishable_...)
npm run dev
```

Apply database schema: [`supabase/migrations/20250530000000_initial_schema.sql`](supabase/migrations/20250530000000_initial_schema.sql)

Hosting guide: [`docs/hosting.md`](docs/hosting.md)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (+ `404.html` for GitHub Pages) |
| `npm run preview` | Preview production build |

## Features

- Email and password authentication
- Create or join a team by slug
- Submit cadence updates with character-band guidance (550 char ideal)
- Daily self Mission rating (1–5) and peer ratings + comment threads
- Weekly / monthly / quarterly team priorities (Step 2) cascading into parent cadence targets
- Realtime team report refresh via Supabase
