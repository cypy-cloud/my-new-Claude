-- ============================================================
-- Migration 028: Team account structure (1차 구현)
-- ============================================================
-- teams / team_members / profiles.team_id already exist from 001_initial_schema.sql.
-- This migration adds:
--   1. team_invites: invite placeholder (no real email sending yet — admin manually
--      connects an existing user to the team from the team management screen)
--   2. RLS so a team owner/manager can read team members' usage_records (team usage view)
--   3. customers.team_id + visibility: structural separation between private and
--      team-shared customer data (still defaults to private; sharing is opt-in per row)

-- ------------------------------------------------------------
-- 0. Helper: is the current user an owner/manager of this team?
--    security definer so it can be reused inside RLS policies
--    (including on team_members itself) without recursive RLS evaluation.
-- ------------------------------------------------------------
create or replace function public.is_team_admin(p_team_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid() and role in ('owner', 'manager')
  )
$$;

-- Extend 001's team_members policies: owners-only -> owners + managers.
-- (001's original policies stay in place; these are additive/permissive.)
create policy "Team admins can view all members" on public.team_members
  for select using (public.is_team_admin(team_id));

create policy "Team admins can manage members" on public.team_members
  for all using (public.is_team_admin(team_id))
  with check (public.is_team_admin(team_id));

-- ------------------------------------------------------------
-- 1. Team invites (placeholder — real email delivery is a future step)
-- ------------------------------------------------------------
create table if not exists public.team_invites (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams(id) on delete cascade not null,
  email text not null,
  role text not null default 'member' check (role in ('manager', 'member')),
  status text not null default 'pending' check (status in ('pending', 'connected', 'cancelled')),
  invited_by uuid references auth.users(id) on delete set null,
  connected_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  connected_at timestamptz,
  unique(team_id, email)
);

create index if not exists idx_team_invites_team on public.team_invites(team_id);
create index if not exists idx_team_invites_email on public.team_invites(email);

alter table public.team_invites enable row level security;

create policy "Team owners/managers can view invites" on public.team_invites
  for select using (public.is_team_admin(team_id));

create policy "Team owners/managers can manage invites" on public.team_invites
  for all using (public.is_team_admin(team_id))
  with check (public.is_team_admin(team_id));

create policy "Admins can manage all invites" on public.team_invites
  for all using (public.is_admin());

-- ------------------------------------------------------------
-- 2. Team usage visibility: owner/manager of a team can read
--    usage_records belonging to members of their own team.
-- ------------------------------------------------------------
create policy "Team owners/managers can view member usage" on public.usage_records
  for select using (
    exists (
      select 1 from public.team_members target
      where target.user_id = usage_records.user_id
        and public.is_team_admin(target.team_id)
    )
  );

-- ------------------------------------------------------------
-- 3. Customers: structural split between private and team-shared records.
--    Existing "Users manage own customers" policy is untouched — owners keep
--    full control of their own rows. This only adds read access for a
--    team owner/manager when a row is explicitly marked visibility = 'team'.
-- ------------------------------------------------------------
alter table public.customers
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists visibility text not null default 'private' check (visibility in ('private', 'team'));

create index if not exists idx_customers_team on public.customers(team_id) where team_id is not null;

create policy "Team owners/managers can view shared team customers" on public.customers
  for select using (
    visibility = 'team'
    and team_id is not null
    and public.is_team_admin(team_id)
  );

-- ------------------------------------------------------------
-- 4. Helper: current user's team role (used by API routes via RPC if needed)
-- ------------------------------------------------------------
create or replace function public.get_my_team_role(p_team_id uuid)
returns text language sql security definer stable as $$
  select role from public.team_members
  where team_id = p_team_id and user_id = auth.uid()
$$;
