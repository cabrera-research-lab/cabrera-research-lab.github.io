-- SEO & GEO health snapshots (collector writes with service role; dashboard reads as authenticated)

create table public.seo_geo_snapshots (
  id uuid primary key default gen_random_uuid(),
  property_id text not null,
  fetched_at timestamptz not null default now(),
  seo_score int,
  geo_score int,
  seo_status text,
  geo_status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index seo_geo_snapshots_property_fetched
  on public.seo_geo_snapshots (property_id, fetched_at desc);

alter table public.seo_geo_snapshots enable row level security;

create policy "seo_geo_snapshots_select"
  on public.seo_geo_snapshots
  for select to authenticated
  using (true);
