-- The day a daily update's words were set up. Null means created_at's
-- calendar day. A bring-forward onto a new week copies the words onto
-- today and keeps the earlier day here.
alter table public.updates
  add column if not exists set_on date;
