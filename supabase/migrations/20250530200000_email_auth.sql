-- Email + password auth: profile username derived from email local part

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
  v_username := lower(trim(split_part(new.email, '@', 1)));
  v_display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    v_username
  );

  insert into public.profiles (user_id, display_name, username)
  values (new.id, v_display, v_username);

  return new;
end;
$$;
