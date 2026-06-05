-- Daily/weekly Step 2 chat: any signed-in user can reply on any update thread.
-- Monthly/quarterly stay team-scoped via is_team_member.

drop policy if exists "comments_insert_team" on public.update_comments;

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
