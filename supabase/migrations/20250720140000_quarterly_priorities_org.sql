-- Allow any signed-in user to read and maintain shared quarterly priorities (org-wide, same pattern as weekly/monthly).

create policy "priority_sets_select_quarterly_authenticated" on public.priority_sets
  for select to authenticated
  using (cadence = 'quarterly');

create policy "priority_items_select_quarterly_authenticated" on public.priority_items
  for select to authenticated
  using (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'quarterly'
    )
  );

create policy "priority_sets_insert_quarterly_authenticated" on public.priority_sets
  for insert to authenticated
  with check (cadence = 'quarterly');

create policy "priority_sets_update_quarterly_authenticated" on public.priority_sets
  for update to authenticated
  using (cadence = 'quarterly');

create policy "priority_items_insert_quarterly_authenticated" on public.priority_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'quarterly'
    )
  );

create policy "priority_items_delete_quarterly_authenticated" on public.priority_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'quarterly'
    )
  );
