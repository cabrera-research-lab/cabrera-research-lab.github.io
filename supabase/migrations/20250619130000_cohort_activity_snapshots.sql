-- Store cohort snapshots on activity log entries for preview and revert

alter table public.mission_moments_cohort_activity
  add column if not exists snapshot_before jsonb,
  add column if not exists snapshot_after jsonb;
