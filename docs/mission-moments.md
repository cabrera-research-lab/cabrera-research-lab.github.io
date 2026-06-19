# Mission Moments — Cohort QC Applet

Internal tool for reviewing B2B cohort setup before go-live. Validates belt paths, user lists, product promises, and final go-live checks.

**Route:** `/mission-moments`  
**Legacy route:** `/b2b-qc` redirects to `/mission-moments`

## Product summary

Mission Moments QC helps delivery teams confirm a cohort is ready:

- Company and cohort metadata (name, dates, user counts)
- Belt progression path (WB → YB → BB/PST → PB → BR → BLACK)
- Promised products and email domain whitelisting
- Automated QC scoring with pass/warn/fail checks
- Final manual checklist (link opens, signup, belt landing, etc.)
- Buyer and company tech email templates
- Activity log with field-level change history and snapshots

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/mission-moments` | `CohortListPage` | List all cohorts with QC score/status |
| `/mission-moments/new` | `CohortQcPage` | Create a new cohort |
| `/mission-moments/:cohortId` | `CohortQcPage` | Edit existing cohort |

Route constants and URL helpers: `src/apps/mission-moments/constants.ts`

## Authentication

Mission Moments uses a **soft auth gate**:

- Unauthenticated users can open the app and see the sign-in prompt
- Cohort list is empty without a session
- Loading and saving cohorts requires authentication (API + Supabase RLS)

Sign in with redirect back:

```
/login?next=/mission-moments
```

Use `missionMomentsLoginPath()` from `constants.ts` when building login links.

## Code map

| Area | Location |
|------|----------|
| Routes | `src/apps/mission-moments/routes.tsx` |
| Cohort list | `src/apps/mission-moments/pages/CohortListPage.tsx` |
| QC form | `src/apps/mission-moments/pages/CohortQcPage.tsx` |
| QC rules (pure) | `src/apps/mission-moments/lib/qcApplet.ts` |
| Supabase API | `src/apps/mission-moments/lib/cohortApi.ts` |
| Activity diff | `src/apps/mission-moments/lib/cohortActivity.ts` |
| Header | `src/apps/mission-moments/components/MissionMomentsHeader.tsx` |
| Activity log UI | `src/apps/mission-moments/components/CohortActivityLog.tsx` |
| Styles | `src/apps/mission-moments/styles/mission-moments.css` |

## Database

Mission Moments migrations (apply after Teaming base schema):

| Migration | Purpose |
|-----------|---------|
| `20250618120000_mission_moments_cohorts.sql` | Cohort table and RLS |
| `20250618130000_migrate_qc_setups_to_cohorts.sql` | Migrate legacy QC setups |
| `20250619120000_mission_moments_cohort_activity.sql` | Activity log table |
| `20250619130000_cohort_activity_snapshots.sql` | Snapshot columns for audit |

**Tables:**

- `mission_moments_cohorts` — cohort form data and QC state (JSON)
- `mission_moments_cohort_activity` — change log entries with optional snapshots

Both tables use RLS requiring `authenticated` role for read/write.

## QC scoring

Scoring logic lives in `qcApplet.ts` (no Supabase dependency). Key exports:

- `runQc(form, finalCheck)` — returns score, status, checks, path
- `makeBuyerEmailTemplate(form)` — buyer-ready email copy
- `makeCompanyTechEmail(form)` — internal tech handoff email
- `downloadQcRecord(form, qc)` — export QC record as file

Belt order and product options are defined as constants in the same file.

## Activity log

When a cohort is saved, `cohortApi.ts`:

1. Diffs the previous state against the new state
2. Writes an activity entry with human-readable change summary
3. Stores a full snapshot for point-in-time restore preview

UI in `CohortActivityLog.tsx` lets users browse history and preview snapshots.

## Styling

All Mission Moments styles are scoped under `.b2b-qc` in `mission-moments.css`. The root class name is legacy from the B2B QC prototype; CSS is isolated from Teaming's global `tokens.css`.

Styles are imported once in `routes.tsx`, not per page.

## Related docs

- [Architecture](./architecture.md) — how Mission Moments fits in the repo
- [Hosting](./hosting.md) — Supabase and GitHub Pages setup
