-- Allow any signed-in user to read team feeds (updates, ratings, comments, names)

create policy "updates_select_authenticated" on public.updates
  for select to authenticated using (true);

create policy "ratings_select_authenticated" on public.update_ratings
  for select to authenticated using (true);

create policy "comments_select_authenticated" on public.update_comments
  for select to authenticated using (true);

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "teams_select_authenticated" on public.teams
  for select to authenticated using (true);
