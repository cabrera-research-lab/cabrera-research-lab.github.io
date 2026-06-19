-- Activity log for Mission Moments cohort QC changes

create table public.mission_moments_cohort_activity (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.mission_moments_cohorts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('created', 'updated')),
  summary text not null,
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index mission_moments_cohort_activity_cohort
  on public.mission_moments_cohort_activity (cohort_id, created_at desc);

alter table public.mission_moments_cohort_activity enable row level security;

create policy "mission_moments_cohort_activity_select"
  on public.mission_moments_cohort_activity
  for select to authenticated
  using (true);

create policy "mission_moments_cohort_activity_insert"
  on public.mission_moments_cohort_activity
  for insert to authenticated
  with check (user_id = auth.uid());
