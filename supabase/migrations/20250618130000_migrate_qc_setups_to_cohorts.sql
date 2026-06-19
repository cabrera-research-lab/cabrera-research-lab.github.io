-- Migrate legacy mission_moments_qc_setups → mission_moments_cohorts (if old table exists)

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'mission_moments_qc_setups'
  ) then
    insert into public.mission_moments_cohorts (
      id,
      name,
      company,
      start_date,
      cohort,
      qc,
      created_by,
      created_at,
      updated_at
    )
    select
      s.id,
      s.name,
      s.company,
      nullif(s.setup -> 'form' ->> 'startDate', '')::date,
      coalesce(s.setup -> 'form', '{}'::jsonb),
      coalesce(s.setup -> 'finalCheck', '{}'::jsonb),
      s.created_by,
      s.created_at,
      s.updated_at
    from public.mission_moments_qc_setups s
    on conflict (id) do nothing;

    drop table public.mission_moments_qc_setups cascade;
  end if;
end $$;
