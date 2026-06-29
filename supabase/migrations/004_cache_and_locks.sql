-- ============================================================
-- Migration 004: Redesigned ai_cache + request_locks
-- ============================================================

-- Drop old ai_cache and rebuild with user-aware schema
drop table if exists public.ai_cache cascade;

create table public.ai_cache (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,  -- null = shared cache
  feature_type text not null check (feature_type in ('ai_message', 'ai_script', 'ai_document')),
  input_hash text not null,
  output_text text not null,
  prompt_version text,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  hit_count integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  -- shared cache: same input across users → one row (user_id null)
  -- user cache: user-specific override (user_id set)
  unique nulls not distinct (user_id, feature_type, input_hash)
);

-- Request locks: prevent duplicate concurrent requests
create table public.request_locks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  feature_type text not null check (feature_type in ('ai_message', 'ai_script', 'ai_document')),
  input_hash text not null,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 seconds'),
  unique(user_id, feature_type, input_hash)
);

-- RLS
alter table public.ai_cache enable row level security;
alter table public.request_locks enable row level security;

-- ai_cache: users can read shared + their own rows
create policy "Users can read shared cache" on public.ai_cache
  for select using (user_id is null or user_id = auth.uid());
create policy "Users can write own cache" on public.ai_cache
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Service can write shared cache" on public.ai_cache
  for insert with check (user_id is null);
create policy "Admins can manage cache" on public.ai_cache
  for all using (public.is_admin());

-- request_locks: users manage their own locks
create policy "Users can manage own locks" on public.request_locks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins can view all locks" on public.request_locks
  for select using (public.is_admin());

-- Indexes
create index idx_ai_cache_lookup
  on public.ai_cache(feature_type, input_hash, expires_at)
  where user_id is null;
create index idx_ai_cache_user_lookup
  on public.ai_cache(user_id, feature_type, input_hash, expires_at);
create index idx_request_locks_lookup
  on public.request_locks(user_id, feature_type, input_hash, status, expires_at);

-- Auto-cleanup expired locks (called via pg_cron or manually)
create or replace function public.cleanup_expired_locks()
returns void language sql security definer as $$
  delete from public.request_locks where expires_at < now();
  delete from public.ai_cache where expires_at < now();
$$;
