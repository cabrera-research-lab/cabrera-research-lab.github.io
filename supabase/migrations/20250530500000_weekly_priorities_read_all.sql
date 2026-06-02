-- Allow any signed-in user to read all teams' weekly priorities (current period sets + items).
-- Writes remain restricted to team members via existing policies.

create policy "priority_sets_select_weekly_authenticated" on public.priority_sets
  for select to authenticated
  using (cadence = 'weekly');

create policy "priority_items_select_weekly_authenticated" on public.priority_items
  for select to authenticated
  using (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and ps.cadence = 'weekly'
    )
  );
