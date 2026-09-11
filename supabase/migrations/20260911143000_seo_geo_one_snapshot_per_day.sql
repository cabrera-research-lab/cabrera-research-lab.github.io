-- One SEO/GEO snapshot per property per UTC day.
-- Same-day Refresh overwrites today's row instead of adding another history bar.

alter table public.seo_geo_snapshots
  add column if not exists snapshot_date date;

update public.seo_geo_snapshots
set snapshot_date = (fetched_at at time zone 'utc')::date
where snapshot_date is null;

delete from public.seo_geo_snapshots as older
where exists (
  select 1
  from public.seo_geo_snapshots as newer
  where newer.property_id = older.property_id
    and (newer.fetched_at at time zone 'utc')::date
      = (older.fetched_at at time zone 'utc')::date
    and (
      newer.fetched_at > older.fetched_at
      or (newer.fetched_at = older.fetched_at and newer.id > older.id)
    )
);

alter table public.seo_geo_snapshots
  alter column snapshot_date set default (timezone('utc', now()))::date;

alter table public.seo_geo_snapshots
  alter column snapshot_date set not null;

create unique index if not exists seo_geo_snapshots_property_day
  on public.seo_geo_snapshots (property_id, snapshot_date);
