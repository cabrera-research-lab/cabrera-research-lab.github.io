# Architecture — Teaming & Mission Moments

This document describes how two product surfaces coexist in one repository without mixing domain logic.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│  App.tsx — root router                                      │
│  BrowserRouter + AuthProvider (shared)                      │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐    ┌──────────────────────────────┐
│  apps/teaming       │    │  apps/mission-moments        │
│  Route: /           │    │  Route: /mission-moments/*   │
│  ProtectedRoute     │    │  Soft auth (per-page)        │
└─────────────────────┘    └──────────────────────────────┘
         │                              │
         └──────────────┬───────────────┘
                        ▼
              ┌──────────────────┐
              │  shared/         │
              │  auth + supabase │
              └──────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Supabase        │
              │  (one project)   │
              └──────────────────┘
```

Both apps deploy as **one static bundle**. They are separate products with separate UI, styles, API modules, and database tables — not separate npm packages.

## Directory structure

### `src/apps/teaming/`

The TE∆M cadence PWA. Everything here is Teaming-specific.

| Path | Purpose |
|------|---------|
| `components/` | UI — cadence tabs, feed, team report, priorities, onboarding |
| `hooks/` | React hooks for cadence gating and form state |
| `lib/` | Domain logic — API, cadence config, periods, types |
| `pages/HomePage.tsx` | Main app shell (cadence query param routing) |
| `routes.tsx` | Route definition exported to `App.tsx` |
| `styles/tokens.css` | Global design system (loaded once in `main.tsx`) |

### `src/apps/mission-moments/`

The cohort QC applet for B2B delivery review.

| Path | Purpose |
|------|---------|
| `components/` | Header, activity log |
| `lib/qcApplet.ts` | Pure QC rules — belts, scoring, email templates |
| `lib/cohortApi.ts` | Supabase CRUD for cohorts and activity |
| `lib/cohortActivity.ts` | Activity diff and snapshot helpers |
| `pages/` | Cohort list and QC detail/edit |
| `routes.tsx` | Nested routes under `/mission-moments/*` |
| `constants.ts` | Route base path and URL helpers |
| `styles/mission-moments.css` | Scoped styles (`.b2b-qc` root class) |

### `src/shared/`

Code used by both apps. Keep this layer thin.

| Path | Purpose |
|------|---------|
| `auth/AuthContext.tsx` | Session state via Supabase Auth |
| `auth/ProtectedRoute.tsx` | Hard auth gate (used by Teaming only) |
| `auth/pages/` | Login and password reset |
| `lib/supabase.ts` | Supabase client singleton |
| `lib/authApi.ts` | Sign in, sign up, sign out, password reset |
| `navigation/SiteNav.tsx` | Global hamburger menu to switch between internal tools |
| `navigation/tools.ts` | Tool registry (Teaming, Mission Moments) |

## Routing

Defined in `src/App.tsx`:

| Path | App | Auth |
|------|-----|------|
| `/login`, `/reset-password` | Shared | Public |
| `/` | Teaming | Required (`ProtectedRoute`) |
| `/mission-moments/*` | Mission Moments | Soft (pages handle session) |
| `/b2b-qc/*` | — | Redirects to `/mission-moments` |

Teaming cadence is **not** a separate route — it uses query params on `/` (`?cadence=daily|weekly|monthly|quarterly`).

Mission Moments nested routes (in `apps/mission-moments/routes.tsx`):

- `/mission-moments` — cohort list
- `/mission-moments/new` — create cohort
- `/mission-moments/:cohortId` — edit existing cohort

## Authentication

Both apps share:

- `AuthProvider` wrapping all routes
- Same Supabase project (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
- Same `profiles` row per user (created on signup)

**Teaming** uses a hard gate: unauthenticated users hitting `/` are redirected to `/login`.

**Mission Moments** uses a soft gate: pages render without login but show a sign-in prompt. Saving cohort data requires a session (enforced in API + RLS).

The login page accepts a `?next=` query param so Mission Moments can redirect back after sign-in (`/login?next=/mission-moments`).

`AuthContext` loads profile and default team for Teaming. Mission Moments only reads `session` from the same context.

## Database separation

Migrations live in `supabase/migrations/`. Tables are namespaced by app:

**Teaming:** `teams`, `profiles`, `team_members`, `updates`, `update_ratings`, `update_comments`, `priority_sets`, `priority_items`

**Mission Moments:** `mission_moments_cohorts`, `mission_moments_cohort_activity`

Both use `auth.users` and `profiles`. No cross-app foreign keys.

## Styling

- **Teaming:** `tokens.css` is global — loaded in `main.tsx`. Applies to auth pages and the main app.
- **Mission Moments:** `mission-moments.css` is imported once in `routes.tsx`. All rules are scoped under `.b2b-qc` so they do not leak into Teaming.

## Import conventions

Use explicit app paths — do not import across app boundaries except through `shared/`:

```tsx
// Teaming code
import { fetchUpdates } from '@/apps/teaming/lib/api';
import { CadenceTabs } from '@/apps/teaming/components/CadenceTabs';

// Mission Moments code
import { runQc } from '@/apps/mission-moments/lib/qcApplet';
import { listCohorts } from '@/apps/mission-moments/lib/cohortApi';

// Shared
import { useAuth } from '@/shared/auth/AuthContext';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
```

**Do not** import Teaming lib from Mission Moments (or vice versa). Shared profile lookups in Mission Moments go through `cohortApi.ts` directly.

## Adding a new feature

1. Decide which app owns it — if unclear, it probably belongs in `shared/` only if both apps need it.
2. Add pages/components/lib under the correct `apps/<name>/` folder.
3. Register routes in that app's `routes.tsx`, then compose in `App.tsx`.
4. Add migrations with a clear table prefix (`mission_moments_*` or teaming tables).
5. Update the relevant doc (`docs/features.md` or `docs/mission-moments.md`).

## Future options

If the products diverge further:

- **Code-splitting:** Lazy-load each app's routes with `React.lazy()` to shrink the initial bundle.
- **Feature flag:** `VITE_ENABLE_MISSION_MOMENTS=false` to hide routes in Teaming-only deploys.
- **Monorepo split:** Extract `packages/teaming`, `packages/mission-moments`, `packages/shared-auth` with two Vite entry points or separate GitHub Pages sites.

The current `apps/` layout supports all of these without a large rewrite.
