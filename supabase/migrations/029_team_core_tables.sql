-- ============================================================
-- Migration 029: Ensure core team tables exist
-- ------------------------------------------------------------
-- 001_initial_schema.sql defines `teams` and `team_members`,
-- but this project's live database never actually has them
-- (028_team_accounts.sql failed with "relation public.team_members
-- does not exist"). This migration (re)creates them idempotently
-- so 028 can run safely afterward, without touching any other
-- already-existing table.
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  team_name text not null,
  owner_user_id uuid references auth.users(id) on delete cascade not null,
  organization_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'manager', 'member')),
  joined_at timestamptz not null default now(),
  unique(team_id, user_id)
);

-- profiles.team_id may also be missing if profiles predates this column
alter table public.profiles
  add column if not exists team_id uuid references public.teams(id) on delete set null;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create index if not exists idx_team_members_team_id on public.team_members(team_id);
create index if not exists idx_team_members_user_id on public.team_members(user_id);

-- updated_at trigger for teams (reuses the shared trigger function from 001)
drop trigger if exists teams_updated_at on public.teams;
create trigger teams_updated_at before update on public.teams
  for each row execute function public.set_updated_at();

-- Base policies from 001 (idempotent: drop-then-create)
drop policy if exists "Owners can manage their teams" on public.teams;
create policy "Owners can manage their teams" on public.teams
  for all using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists "Members can view their teams" on public.teams;
create policy "Members can view their teams" on public.teams
  for select using (
    exists (select 1 from public.team_members tm where tm.team_id = id and tm.user_id = auth.uid())
  );

drop policy if exists "Admins can view all teams" on public.teams;
create policy "Admins can view all teams" on public.teams
  for select using (public.is_admin());

drop policy if exists "Users can view their team memberships" on public.team_members;
create policy "Users can view their team memberships" on public.team_members
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.teams t where t.id = team_id and t.owner_user_id = auth.uid())
  );

drop policy if exists "Team owners can manage members" on public.team_members;
create policy "Team owners can manage members" on public.team_members
  for all using (
    exists (select 1 from public.teams t where t.id = team_id and t.owner_user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.teams t where t.id = team_id and t.owner_user_id = auth.uid())
  );
