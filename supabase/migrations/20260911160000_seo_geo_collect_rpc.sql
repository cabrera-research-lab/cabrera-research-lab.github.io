-- Authenticated SEO/GEO refresh without an Edge Function.
-- Uses the http extension so Postgres can fetch public pages, then upserts today's snapshot.
-- Parameter names never match table columns (avoids PL/pgSQL "column reference is ambiguous").

create extension if not exists http with schema extensions;

create or replace function public.seo_geo_resolve_url(p_base text, p_loc text)
returns text
language plpgsql
immutable
as $$
declare
  origin text;
  dir text;
begin
  if p_loc is null or length(btrim(p_loc)) = 0 then
    return p_base;
  end if;
  p_loc := btrim(p_loc);
  if p_loc ~* '^https?://' then
    return p_loc;
  end if;
  if left(p_loc, 2) = '//' then
    return split_part(p_base, ':', 1) || ':' || p_loc;
  end if;
  origin := regexp_replace(p_base, '^(https?://[^/]+).*$', '\1');
  if left(p_loc, 1) = '/' then
    return origin || p_loc;
  end if;
  dir := regexp_replace(p_base, '^(https?://.*/)[^/]*$', '\1');
  if dir is null or dir = p_base then
    dir := origin || '/';
  end if;
  return dir || p_loc;
end;
$$;

revoke all on function public.seo_geo_resolve_url(text, text) from public, anon, authenticated;

create or replace function public.seo_geo_fetch_doc(p_url text, p_limit int default 80000)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  req extensions.http_request;
  res extensions.http_response;
  current_url text := p_url;
  hops int := 0;
  loc text;
  body text;
  xrobots text;
begin
  if p_url is null or length(p_url) = 0 then
    return null;
  end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '25');
  perform extensions.http_set_curlopt('CURLOPT_CONNECTTIMEOUT', '10');

  loop
    hops := hops + 1;
    loc := null;
    req := (
      'GET',
      current_url,
      array[
        extensions.http_header(
          'User-Agent',
          'Mozilla/5.0 (compatible; STSI-SEO-GEO/1.0; +https://practice.stsi.pro/)'
        ),
        extensions.http_header('Accept', 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8')
      ],
      null,
      null
    )::extensions.http_request;

    begin
      res := extensions.http(req);
    exception when others then
      return jsonb_build_object(
        'url', p_url,
        'finalUrl', current_url,
        'status', 0,
        'redirected', current_url is distinct from p_url,
        'contentType', null,
        'xRobotsTag', null,
        'body', '',
        'error', sqlerrm
      );
    end;

    if res.status in (301, 302, 303, 307, 308) and hops < 8 then
      select h.value
        into loc
      from unnest(coalesce(res.headers, array[]::extensions.http_header[])) as h
      where lower(h.field) = 'location'
      limit 1;
      if loc is not null and length(btrim(loc)) > 0 then
        current_url := public.seo_geo_resolve_url(current_url, loc);
        continue;
      end if;
    end if;
    exit;
  end loop;

  body := coalesce(res.content, '');
  if length(body) > p_limit then
    body := left(body, p_limit);
  end if;

  begin
    select h.value
      into xrobots
    from unnest(coalesce(res.headers, array[]::extensions.http_header[])) as h
    where lower(h.field) = 'x-robots-tag'
    limit 1;
  exception when others then
    xrobots := null;
  end;

  return jsonb_build_object(
    'url', p_url,
    'finalUrl', current_url,
    'status', coalesce(res.status, 0),
    'redirected', current_url is distinct from p_url,
    'contentType', res.content_type,
    'xRobotsTag', xrobots,
    'body', body
  );
end;
$$;

revoke all on function public.seo_geo_fetch_doc(text, int) from public, anon, authenticated;

-- Worker: no parameter or variable named property_id / fetched_at / payload / snapshot_date.
create or replace function public.seo_geo_collect_run(p_target text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  spec record;
  v_payload jsonb;
  v_robots jsonb;
  v_sitemap jsonb;
  v_listed text;
  v_fetched timestamptz := timezone('utc', now());
  v_day date := (timezone('utc', now()))::date;
  v_results jsonb := '[]'::jsonb;
  v_selected int := 0;
begin
  for spec in
    select *
    from (
      values
        ('practice', 'https://stsi.tools/', 'https://practice.stsi.pro/', 'https://stsi.tools/robots.txt', 'https://stsi.tools/sitemap.xml', 'https://stsi.tools/llms.txt'),
        ('stsi-pro', 'https://stsi.pro/', null, 'https://stsi.pro/robots.txt', 'https://stsi.pro/sitemap.xml', 'https://stsi.pro/llms.txt'),
        ('camp', 'https://camp.stsi.pro/', null, 'https://camp.stsi.pro/robots.txt', 'https://camp.stsi.pro/sitemap.xml', 'https://camp.stsi.pro/llms.txt'),
        ('jost', 'https://jost.science/', null, 'https://jost.science/robots.txt', 'https://jost.science/sitemap.xml', 'https://jost.science/llms.txt'),
        ('cabreralab', 'https://cabreralab.science/', 'https://www.cabreralab.science/', 'https://cabreralab.science/robots.txt', 'https://cabreralab.science/sitemap.xml', 'https://cabreralab.science/llms.txt'),
        ('evidence', 'https://evidence.cabreralab.science/', null, 'https://evidence.cabreralab.science/robots.txt', 'https://evidence.cabreralab.science/sitemap.xml', 'https://evidence.cabreralab.science/llms.txt')
    ) as t(id, home, alias_home, robots, sitemap, llms)
    where p_target = 'all' or t.id = p_target
  loop
    v_selected := v_selected + 1;
    v_robots := public.seo_geo_fetch_doc(spec.robots, 20000);
    v_sitemap := public.seo_geo_fetch_doc(spec.sitemap, 80000);
    if coalesce((v_sitemap ->> 'status')::int, 0) >= 400 then
      v_listed := (regexp_match(coalesce(v_robots ->> 'body', ''), '^sitemap:\s*(\S+)', 'in'))[1];
      if v_listed is not null then
        v_sitemap := public.seo_geo_fetch_doc(v_listed, 80000);
      end if;
    end if;

    v_payload := jsonb_build_object(
      'propertyId', spec.id,
      'fetchedAt', to_char(v_fetched, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'home', public.seo_geo_fetch_doc(spec.home, 80000),
      'aliasHome', public.seo_geo_fetch_doc(spec.alias_home, 80000),
      'robots', v_robots,
      'sitemap', v_sitemap,
      'llms', public.seo_geo_fetch_doc(spec.llms, 20000)
    );

    insert into public.seo_geo_snapshots (
      property_id,
      fetched_at,
      snapshot_date,
      payload
    )
    values (
      spec.id,
      v_fetched,
      v_day,
      v_payload
    )
    on conflict (property_id, snapshot_date)
    do update set
      fetched_at = excluded.fetched_at,
      payload = excluded.payload;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'id', spec.id,
        'home', v_payload #>> '{home,status}',
        'sitemap', v_payload #>> '{sitemap,status}',
        'llms', v_payload #>> '{llms,status}'
      )
    );
  end loop;

  if v_selected = 0 then
    raise exception 'Unknown property: %', p_target;
  end if;

  return jsonb_build_object('ok', true, 'results', v_results);
end;
$$;

revoke all on function public.seo_geo_collect_run(text) from public, anon, authenticated;

-- Public RPC name stays property_id so the dashboard does not need a redeploy.
create or replace function public.seo_geo_collect(property_id text default 'all')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target text := coalesce(nullif(property_id, ''), 'all');
begin
  if auth.uid() is null then
    raise exception 'Sign in to refresh scores';
  end if;
  return public.seo_geo_collect_run(v_target);
end;
$$;

revoke all on function public.seo_geo_collect(text) from public, anon;
grant execute on function public.seo_geo_collect(text) to authenticated;
