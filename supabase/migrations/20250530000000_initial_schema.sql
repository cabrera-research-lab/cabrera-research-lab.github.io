-- Teaming PWA initial schema

create extension if not exists "pgcrypto";

-- Teams
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Profiles (extends auth.users)
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  default_team_id uuid references public.teams (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'lead')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- Updates (standups / learnings)
create table public.updates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  cadence text not null check (cadence in ('daily', 'weekly', 'monthly', 'quarterly')),
  answers jsonb not null default '[]'::jsonb,
  self_mission_score int check (self_mission_score is null or (self_mission_score >= 1 and self_mission_score <= 5)),
  created_at timestamptz not null default now()
);

create index updates_team_cadence_created on public.updates (team_id, cadence, created_at desc);

create table public.update_ratings (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.updates (id) on delete cascade,
  rater_id uuid not null references auth.users (id) on delete cascade,
  stars int not null check (stars >= 1 and stars <= 5),
  created_at timestamptz not null default now(),
  unique (update_id, rater_id)
);

create table public.update_comments (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.updates (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Priority sets (Step 2)
create table public.priority_sets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  cadence text not null check (cadence in ('weekly', 'monthly', 'quarterly')),
  period_start date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, cadence, period_start)
);

create table public.priority_items (
  id uuid primary key default gen_random_uuid(),
  priority_set_id uuid not null references public.priority_sets (id) on delete cascade,
  sort_order int not null default 0,
  goal text not null default '',
  owner text not null default '',
  metric text not null default '',
  action text not null default '',
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: user is team member
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

-- RLS
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.updates enable row level security;
alter table public.update_ratings enable row level security;
alter table public.update_comments enable row level security;
alter table public.priority_sets enable row level security;
alter table public.priority_items enable row level security;

-- Teams: members can read their teams; authenticated users can create
create policy "teams_select_member" on public.teams
  for select using (public.is_team_member(id));

create policy "teams_insert_authenticated" on public.teams
  for insert to authenticated with check (true);

create policy "teams_select_by_slug_for_join" on public.teams
  for select to authenticated using (true);

-- Profiles
create policy "profiles_select_own" on public.profiles
  for select using (user_id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (user_id = auth.uid());

create policy "profiles_select_team" on public.profiles
  for select using (
    exists (
      select 1 from public.team_members tm1
      join public.team_members tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth.uid() and tm2.user_id = profiles.user_id
    )
  );

-- Team members
create policy "team_members_select" on public.team_members
  for select using (public.is_team_member(team_id));

create policy "team_members_insert_self" on public.team_members
  for insert to authenticated with check (user_id = auth.uid());

-- Updates
create policy "updates_select_team" on public.updates
  for select using (public.is_team_member(team_id));

create policy "updates_insert_team" on public.updates
  for insert to authenticated
  with check (public.is_team_member(team_id) and user_id = auth.uid());

-- Ratings
create policy "ratings_select_team" on public.update_ratings
  for select using (
    exists (
      select 1 from public.updates u
      where u.id = update_id and public.is_team_member(u.team_id)
    )
  );

create policy "ratings_upsert_team" on public.update_ratings
  for insert to authenticated
  with check (
    rater_id = auth.uid() and
    exists (
      select 1 from public.updates u
      where u.id = update_id and public.is_team_member(u.team_id)
    )
  );

create policy "ratings_update_own" on public.update_ratings
  for update using (rater_id = auth.uid());

-- Comments
create policy "comments_select_team" on public.update_comments
  for select using (
    exists (
      select 1 from public.updates u
      where u.id = update_id and public.is_team_member(u.team_id)
    )
  );

create policy "comments_insert_team" on public.update_comments
  for insert to authenticated
  with check (
    author_id = auth.uid() and
    exists (
      select 1 from public.updates u
      where u.id = update_id and public.is_team_member(u.team_id)
    )
  );

-- Priority sets
create policy "priority_sets_select_team" on public.priority_sets
  for select using (public.is_team_member(team_id));

create policy "priority_sets_insert_team" on public.priority_sets
  for insert to authenticated with check (public.is_team_member(team_id));

create policy "priority_sets_update_team" on public.priority_sets
  for update using (public.is_team_member(team_id));

-- Priority items
create policy "priority_items_select" on public.priority_items
  for select using (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and public.is_team_member(ps.team_id)
    )
  );

create policy "priority_items_insert" on public.priority_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and public.is_team_member(ps.team_id)
    )
  );

create policy "priority_items_delete" on public.priority_items
  for delete using (
    exists (
      select 1 from public.priority_sets ps
      where ps.id = priority_set_id and public.is_team_member(ps.team_id)
    )
  );

-- Realtime
alter publication supabase_realtime add table public.updates;
alter publication supabase_realtime add table public.update_comments;
alter publication supabase_realtime add table public.update_ratings;
