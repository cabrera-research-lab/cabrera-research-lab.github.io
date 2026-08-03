-- Allow priorities to be marked complete while remaining in the shared list.

alter table public.priority_items
  add column if not exists completed boolean not null default false;
