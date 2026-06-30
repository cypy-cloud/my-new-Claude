-- ============================================================
-- Migration 030: Fix infinite recursion in teams/team_members RLS
-- ------------------------------------------------------------
-- "Members can view their teams" (on teams) queries team_members,
-- and "Users can view their team memberships" (on team_members)
-- queries teams — each table's policy re-triggers the other
-- table's RLS, causing Postgres to report
-- "infinite recursion detected in policy for relation teams".
--
-- Fix: route the cross-table checks through SECURITY DEFINER
-- helper functions (same pattern already used by is_team_admin
-- in 028_team_accounts.sql), which run with the table owner's
-- privileges and therefore bypass RLS instead of re-triggering it.
-- ============================================================

create or replace function public.is_team_owner(p_team_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.teams
    where id = p_team_id and owner_user_id = auth.uid()
  )
$$;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  )
$$;

-- teams: replace the team_members-querying policy
drop policy if exists "Members can view their teams" on public.teams;
create policy "Members can view their teams" on public.teams
  for select using (public.is_team_member(id));

-- team_members: replace the teams-querying policies
drop policy if exists "Users can view their team memberships" on public.team_members;
create policy "Users can view their team memberships" on public.team_members
  for select using (
    user_id = auth.uid() or public.is_team_owner(team_id)
  );

drop policy if exists "Team owners can manage members" on public.team_members;
create policy "Team owners can manage members" on public.team_members
  for all using (public.is_team_owner(team_id))
  with check (public.is_team_owner(team_id));
