-- TQ enhancement applet.
-- The question bank ships with the app. These tables store each member's own
-- pick, comment, and rewrite. Members can read and write only their rows.
-- One reviewer account can read every row and cannot change anyone else's.

create table public.tq_reviewers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.tq_responses (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_order int not null check (question_order > 0),
  pick text check (pick is null or pick in ('original', 'A', 'B', 'C', 'edit', 'drop')),
  comment text not null default '',
  edit_stem text not null default '',
  edit_choices text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, question_order)
);

create index tq_responses_question_order on public.tq_responses (question_order);

alter table public.tq_reviewers enable row level security;
alter table public.tq_responses enable row level security;

create or replace function public.is_tq_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tq_reviewers
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_tq_reviewer() from public, anon, authenticated;
grant execute on function public.is_tq_reviewer() to authenticated;

create or replace function public.tq_response_names()
returns table (user_id uuid, display_name text, email text)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    coalesce(nullif(btrim(p.display_name), ''), ''),
    coalesce(u.email, '')
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where public.is_tq_reviewer()
    and exists (
      select 1
      from public.tq_responses r
      where r.user_id = u.id
    );
$$;

revoke all on function public.tq_response_names() from public, anon, authenticated;
grant execute on function public.tq_response_names() to authenticated;

create policy "tq_reviewers_select_self" on public.tq_reviewers
  for select to authenticated
  using (user_id = auth.uid());

create policy "tq_responses_select_own_or_reviewer" on public.tq_responses
  for select to authenticated
  using (user_id = auth.uid() or public.is_tq_reviewer());

create policy "tq_responses_insert_own" on public.tq_responses
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "tq_responses_update_own" on public.tq_responses
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "tq_responses_delete_own" on public.tq_responses
  for delete to authenticated
  using (user_id = auth.uid());

insert into public.tq_reviewers (user_id)
select id
from auth.users
where lower(email) = 'sreek@stsi.pro'
on conflict (user_id) do nothing;
