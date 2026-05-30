# Hosting — GitHub Pages + Supabase (free tier)

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
2. Settings → Pages → Source: **GitHub Actions**.
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

## Free-tier limits

| Service | Limit | Notes |
|---------|-------|-------|
| GitHub Pages | ~100 GB/month bandwidth | Fine for internal teams |
| Supabase | 500 MB DB, 50k MAU | Text updates stay small |
| Supabase | Pauses after ~7 days inactivity | Weekly usage usually prevents pause |
| Supabase | No automated backups on free | Export schema before major changes |

## SPA routing

`npm run build` copies `index.html` to `404.html` so client-side routes work on refresh (GitHub Pages has no server rewrites).

## Upgrade path

- **Supabase Pro (~$25/mo):** always-on, daily backups, more egress.
- Custom SMTP for branded magic-link emails (optional).
