-- Per-variant validation for the TQ question bank.
-- A member marks each shared variant good or not, comments on it, and may add
-- their own variants. They can read and write only their rows. The reviewer
-- account can read every row and cannot change anyone else's.

create table public.tq_variant_feedback (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_order int not null check (question_order > 0),
  variant_key text not null check (variant_key in ('original', 'A', 'B', 'C')),
  is_good boolean,
  comment text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, question_order, variant_key)
);

create table public.tq_added_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_order int not null check (question_order > 0),
  stem text not null default '',
  choices text[] not null default '{}',
  figure text not null default '',
  is_good boolean,
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tq_added_variants_question on public.tq_added_variants (question_order, user_id);
create index tq_variant_feedback_question on public.tq_variant_feedback (question_order);

alter table public.tq_variant_feedback enable row level security;
alter table public.tq_added_variants enable row level security;

create policy "tq_feedback_select_own_or_reviewer" on public.tq_variant_feedback
  for select to authenticated
  using (user_id = auth.uid() or public.is_tq_reviewer());

create policy "tq_feedback_insert_own" on public.tq_variant_feedback
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "tq_feedback_update_own" on public.tq_variant_feedback
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "tq_feedback_delete_own" on public.tq_variant_feedback
  for delete to authenticated
  using (user_id = auth.uid());

create policy "tq_added_select_own_or_reviewer" on public.tq_added_variants
  for select to authenticated
  using (user_id = auth.uid() or public.is_tq_reviewer());

create policy "tq_added_insert_own" on public.tq_added_variants
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "tq_added_update_own" on public.tq_added_variants
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "tq_added_delete_own" on public.tq_added_variants
  for delete to authenticated
  using (user_id = auth.uid());

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
    and (
      exists (select 1 from public.tq_variant_feedback r where r.user_id = u.id)
      or exists (select 1 from public.tq_added_variants a where a.user_id = u.id)
    );
$$;

revoke all on function public.tq_response_names() from public, anon, authenticated;
grant execute on function public.tq_response_names() to authenticated;

drop table if exists public.tq_responses;
