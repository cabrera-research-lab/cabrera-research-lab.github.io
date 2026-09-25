-- Keyword dashboard for every SEO/GEO property.
-- Connections stay "missing" until each site is added in Google Search Console
-- and the existing service account is granted access.

insert into public.seo_geo_gsc_connections (property_id, status)
values
  ('practice', 'missing'),
  ('camp', 'missing'),
  ('jost', 'missing'),
  ('cabreralab', 'missing'),
  ('evidence', 'missing')
on conflict (property_id) do nothing;

insert into public.seo_geo_target_keywords (property_id, phrase, kind) values
  ('practice', 'stsi practice', 'brand'),
  ('practice', 'practice.stsi.pro', 'brand'),
  ('practice', 'stsi.tools', 'brand'),
  ('practice', 'systems thinking standards institute', 'brand'),
  ('practice', 'professional systems thinker', 'brand'),
  ('practice', 'systems thinking practice', 'nonbrand'),
  ('practice', 'systems thinking training', 'nonbrand'),
  ('practice', 'dsrp practice', 'nonbrand'),
  ('camp', 'stsi camp', 'brand'),
  ('camp', 'camp.stsi.pro', 'brand'),
  ('camp', 'systems thinking standards institute', 'brand'),
  ('camp', 'systems thinking community', 'nonbrand'),
  ('camp', 'systems thinking camp', 'nonbrand'),
  ('jost', 'journal of systems thinking', 'brand'),
  ('jost', 'jost', 'brand'),
  ('jost', 'jost.science', 'brand'),
  ('jost', 'systems thinking journal', 'nonbrand'),
  ('jost', 'systems thinking research', 'nonbrand'),
  ('cabreralab', 'cabrera research lab', 'brand'),
  ('cabreralab', 'cabreralab', 'brand'),
  ('cabreralab', 'cabreralab.science', 'brand'),
  ('cabreralab', 'dsrp', 'nonbrand'),
  ('cabreralab', 'systems thinking', 'nonbrand'),
  ('evidence', 'cabrera research lab', 'brand'),
  ('evidence', 'evidence.cabreralab.science', 'brand'),
  ('evidence', 'dsrp evidence', 'nonbrand'),
  ('evidence', 'systems thinking evidence', 'nonbrand'),
  ('evidence', 'o-theory', 'nonbrand')
on conflict (property_id, (lower(phrase))) do nothing;
