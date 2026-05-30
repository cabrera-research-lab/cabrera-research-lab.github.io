-- Daily and weekly feed: any signed-in user can rate and comment (not only teammates)

create policy "ratings_insert_shared_feed" on public.update_ratings
  for insert to authenticated
  with check (
    rater_id = auth.uid()
    and exists (
      select 1 from public.updates u
      where u.id = update_id and u.cadence in ('daily', 'weekly')
    )
  );

create policy "comments_insert_shared_feed" on public.update_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.updates u
      where u.id = update_id and u.cadence in ('daily', 'weekly')
    )
  );
