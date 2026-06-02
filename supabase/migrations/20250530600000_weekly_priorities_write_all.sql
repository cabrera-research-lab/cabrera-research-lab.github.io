-- Any signed-in user can maintain the shared weekly priority list (org decides together).

create policy "priority_sets_insert_weekly_authenticated" on public.priority_sets
  for insert to authenticated
  with check (cadence = 'weekly');

create policy "priority_sets_update_weekly_authenticated" on public.priority_sets
  for update to authenticated
  using (cadence = 'weekly');

create policy "priority_items_insert_weekly_authenticated" on public.priority_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'weekly'
    )
  );

create policy "priority_items_delete_weekly_authenticated" on public.priority_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'weekly'
    )
  );
