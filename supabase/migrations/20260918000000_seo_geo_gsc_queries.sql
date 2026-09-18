-- Google Search Console keyword snapshots for SEO/GEO.
-- Collector writes with the service role; dashboard reads as authenticated.
-- v1 is stsi.pro only; other properties can reuse the same tables later.

create table public.seo_geo_gsc_connections (
  property_id text primary key,
  gsc_site_url text,
  status text not null default 'missing'
    check (status in ('missing', 'connected', 'error')),
  last_synced_at timestamptz,
  last_error text,
  last_row_count int,
  updated_at timestamptz not null default now()
);

create table public.seo_geo_target_keywords (
  id uuid primary key default gen_random_uuid(),
  property_id text not null,
  phrase text not null,
  kind text not null default 'nonbrand'
    check (kind in ('brand', 'nonbrand')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index seo_geo_target_keywords_property_phrase
  on public.seo_geo_target_keywords (property_id, lower(phrase));

create table public.seo_geo_query_daily (
  id uuid primary key default gen_random_uuid(),
  property_id text not null,
  date date not null,
  query text not null,
  page text not null,
  clicks int not null default 0,
  impressions int not null default 0,
  ctr numeric,
  position numeric,
  created_at timestamptz not null default now(),
  unique (property_id, date, query, page)
);

create index seo_geo_query_daily_property_date
  on public.seo_geo_query_daily (property_id, date desc);

alter table public.seo_geo_gsc_connections enable row level security;
alter table public.seo_geo_target_keywords enable row level security;
alter table public.seo_geo_query_daily enable row level security;

create policy "seo_geo_gsc_connections_select"
  on public.seo_geo_gsc_connections
  for select to authenticated
  using (true);

create policy "seo_geo_target_keywords_select"
  on public.seo_geo_target_keywords
  for select to authenticated
  using (true);

create policy "seo_geo_query_daily_select"
  on public.seo_geo_query_daily
  for select to authenticated
  using (true);

insert into public.seo_geo_gsc_connections (property_id, status)
values ('stsi-pro', 'missing')
on conflict (property_id) do nothing;

insert into public.seo_geo_target_keywords (property_id, phrase, kind) values
  ('stsi-pro', 'stsi', 'brand'),
  ('stsi-pro', 'systems thinking standards institute', 'brand'),
  ('stsi-pro', 'professional systems thinker', 'brand'),
  ('stsi-pro', 'pst', 'brand'),
  ('stsi-pro', 'pst-sa', 'brand'),
  ('stsi-pro', 'pst credential', 'brand'),
  ('stsi-pro', 'systems thinking certification', 'nonbrand'),
  ('stsi-pro', 'systems thinking training', 'nonbrand'),
  ('stsi-pro', 'systems thinking standard', 'nonbrand'),
  ('stsi-pro', 'dsrp training', 'nonbrand'),
  ('stsi-pro', 'professional systems thinking organization', 'nonbrand')
on conflict (property_id, (lower(phrase))) do nothing;
