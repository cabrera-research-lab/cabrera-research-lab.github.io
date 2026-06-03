-- Allow users to set their own daily mission score (Step 3 self-rating).
create policy "updates_update_own_daily_mission" on public.updates
  for update using (
    user_id = auth.uid() and cadence = 'daily'
  )
  with check (
    user_id = auth.uid() and cadence = 'daily'
  );
