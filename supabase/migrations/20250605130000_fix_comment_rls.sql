-- Idempotent fix for cross-team Step 2 comment replies.

create or replace function public.add_update_comment(p_update_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if trim(p_body) = '' then
    raise exception 'Comment cannot be empty';
  end if;

  if not exists (
    select 1
    from public.updates u
    where u.id = p_update_id
      and (
        u.cadence in ('daily', 'weekly')
        or (
          u.cadence in ('monthly', 'quarterly')
          and public.is_team_member(u.team_id)
        )
      )
  ) then
    raise exception 'Not allowed to comment on this update';
  end if;

  insert into public.update_comments (update_id, author_id, body)
  values (p_update_id, auth.uid(), trim(p_body))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.add_update_comment(uuid, text) from public;
grant execute on function public.add_update_comment(uuid, text) to authenticated;

drop policy if exists "comments_insert_team" on public.update_comments;
drop policy if exists "comments_insert_shared_feed" on public.update_comments;

create policy "comments_insert_shared_feed" on public.update_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.updates u
      where u.id = update_id and u.cadence in ('daily', 'weekly')
    )
  );

create policy "comments_insert_team" on public.update_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.updates u
      where u.id = update_id
        and u.cadence in ('monthly', 'quarterly')
        and public.is_team_member(u.team_id)
    )
  );

notify pgrst, 'reload schema';
