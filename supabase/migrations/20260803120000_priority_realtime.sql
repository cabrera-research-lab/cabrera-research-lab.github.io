-- Allow row-level updates so concurrent editors can upsert without wipe-and-replace.
-- Enable realtime so open priority panels refresh when others change the shared list.

create policy "priority_items_update_team" on public.priority_items
  for update to authenticated
  using (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and public.is_team_member(ps.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and public.is_team_member(ps.team_id)
    )
  );

create policy "priority_items_update_weekly_authenticated" on public.priority_items
  for update to authenticated
  using (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'weekly'
    )
  )
  with check (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'weekly'
    )
  );

create policy "priority_items_update_monthly_authenticated" on public.priority_items
  for update to authenticated
  using (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'monthly'
    )
  )
  with check (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'monthly'
    )
  );

create policy "priority_items_update_quarterly_authenticated" on public.priority_items
  for update to authenticated
  using (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'quarterly'
    )
  )
  with check (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'quarterly'
    )
  );

alter table public.priority_items replica identity full;
alter table public.priority_sets replica identity full;

alter publication supabase_realtime add table public.priority_sets;
alter publication supabase_realtime add table public.priority_items;
