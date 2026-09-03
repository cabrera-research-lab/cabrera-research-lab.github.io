# Hosting — GitHub Pages + Supabase (free tier)

One deployment serves **all apps** (Teaming at `/`, Mission Moments at `/mission-moments`, SEO & GEO at `/seo-geo`). See [Architecture](./architecture.md).

## Architecture

- **Frontend:** Static PWA built with Vite, deployed via GitHub Actions to GitHub Pages.
- **Backend:** Supabase Free (Auth, Postgres, RLS, Realtime).

## One-time setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run all SQL migrations in [`supabase/migrations/`](../supabase/migrations/) in order in the SQL Editor (or use Supabase CLI).
3. Copy **Project URL** (Settings → API) and the **Publishable key** (`sb_publishable_...`) from **API Keys → Publishable and secret API keys** (not the legacy anon tab).
4. Authentication → Providers → **Email**: enable **Email + password** sign-up/sign-in.
   - For a pilot, you can disable **Confirm email** under Email settings so new accounts work immediately.
5. Authentication → URL configuration:
   - **Site URL:** `https://cabrera-research-lab.github.io/`
   - **Redirect URLs:** `https://cabrera-research-lab.github.io/**`, `http://localhost:5173/**`

Users sign in with **email and password** (real addresses, e.g. work email).

### 2. GitHub repository

1. Settings → Secrets → Actions:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SEO_GEO_SUPABASE_SERVICE_ROLE_KEY` (service role / secret key — collector only, never a Vite env)
2. Settings → Pages → Build and deployment → Source: **GitHub Actions** (not “Deploy from branch”).
   - If Source is set to `main` / `/`, GitHub serves raw repo files and the browser loads `/src/main.tsx` with the wrong MIME type (`application/octet-stream`).
3. After the first deploy, the site is live at **https://cabrera-research-lab.github.io/** (org Pages site from `cabrera-research-lab.github.io` repo).
4. `vite.config.ts` uses `base: '/'` because the org site is served from the domain root, not `/Teaming/`.

### 3. Local development

```bash
cp .env.example .env
# fill in Supabase values
npm install
npm run dev
```

## Deploy

Push to `main`. The workflow [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) builds and publishes `dist/` to GitHub Pages.

## SEO & GEO collector

The dashboard cannot crawl third-party sites from the browser. A second workflow [`.github/workflows/seo-geo-collect.yml`](../.github/workflows/seo-geo-collect.yml) fetches public pages nightly and writes `seo_geo_snapshots`.

1. Run migration `20260903180000_seo_geo_snapshots.sql` in the Supabase SQL editor.
2. Add GitHub secret `SEO_GEO_SUPABASE_SERVICE_ROLE_KEY`.
3. Actions → **Collect SEO & GEO** → Run workflow (or wait for 06:00 UTC).

Local dry-run: `npm run collect:seo-geo -- --dry-run`

See [SEO & GEO](./seo-geo.md).

## Free-tier limits

| Service | Limit | Notes |
|---------|-------|-------|
| GitHub Pages | ~100 GB/month bandwidth | Fine for internal teams |
| Supabase | 500 MB DB, 50k MAU | Text updates stay small |
| Supabase | Pauses after ~7 days inactivity | Weekly usage usually prevents pause |
| Supabase | No automated backups on free | Export schema before major changes |

## SPA routing

`npm run build` copies `index.html` to `404.html` so client-side routes work on refresh (GitHub Pages has no server rewrites).

## Troubleshooting

**“Failed to load module script… MIME type application/octet-stream”**

GitHub Pages is serving the development `index.html` (`/src/main.tsx`) instead of the Vite build in `dist/`. Fix:

1. Repo → **Settings → Pages → Build and deployment → Source** → **GitHub Actions**
2. Re-run the **Deploy to GitHub Pages** workflow (Actions tab → workflow → Run workflow)
3. Confirm the live page source references `/assets/index-….js`, not `/src/main.tsx`

## Upgrade path

- **Supabase Pro (~$25/mo):** always-on, daily backups, more egress.
- Custom SMTP for branded magic-link emails (optional).
