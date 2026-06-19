-- Mission Moments QC Applet: persisted cohorts and QC status

create table public.mission_moments_cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null default '',
  start_date date,
  cohort jsonb not null,
  qc jsonb not null default '{}'::jsonb,
  qc_score int,
  qc_status text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mission_moments_cohorts_updated
  on public.mission_moments_cohorts (updated_at desc);

create index mission_moments_cohorts_company
  on public.mission_moments_cohorts (company);

create index mission_moments_cohorts_start_date
  on public.mission_moments_cohorts (start_date desc);

alter table public.mission_moments_cohorts enable row level security;

create policy "mission_moments_cohorts_select"
  on public.mission_moments_cohorts
  for select to authenticated
  using (true);

create policy "mission_moments_cohorts_insert"
  on public.mission_moments_cohorts
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "mission_moments_cohorts_update"
  on public.mission_moments_cohorts
  for update to authenticated
  using (true)
  with check (true);

create policy "mission_moments_cohorts_delete"
  on public.mission_moments_cohorts
  for delete to authenticated
  using (true);
