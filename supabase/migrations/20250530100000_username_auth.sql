-- Username + password auth (username stored on profile; auth uses synthetic email)

alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_unique
  on public.profiles (username)
  where username is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_display text;
begin
  v_username := lower(trim(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))));
  v_display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    v_username
  );

  insert into public.profiles (user_id, display_name, username)
  values (new.id, v_display, v_username);

  return new;
end;
$$;
