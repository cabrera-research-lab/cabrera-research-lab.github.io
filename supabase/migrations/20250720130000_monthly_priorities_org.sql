-- Allow any signed-in user to read and maintain shared monthly priorities (org-wide, same pattern as weekly).

create policy "priority_sets_select_monthly_authenticated" on public.priority_sets
  for select to authenticated
  using (cadence = 'monthly');

create policy "priority_items_select_monthly_authenticated" on public.priority_items
  for select to authenticated
  using (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'monthly'
    )
  );

create policy "priority_sets_insert_monthly_authenticated" on public.priority_sets
  for insert to authenticated
  with check (cadence = 'monthly');

create policy "priority_sets_update_monthly_authenticated" on public.priority_sets
  for update to authenticated
  using (cadence = 'monthly');

create policy "priority_items_insert_monthly_authenticated" on public.priority_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'monthly'
    )
  );

create policy "priority_items_delete_monthly_authenticated" on public.priority_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'monthly'
    )
  );
