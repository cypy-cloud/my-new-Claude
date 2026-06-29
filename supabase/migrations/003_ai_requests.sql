-- ============================================================
-- Migration 003: AI Requests log table
-- ============================================================

create table if not exists public.ai_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  feature_type text not null check (feature_type in ('ai_message', 'ai_script', 'ai_document')),
  provider text not null,
  model text not null,
  prompt_version text,
  input_hash text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost numeric(10, 8) not null default 0,
  status text not null check (status in ('success', 'failed', 'cached')),
  error_message text,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.ai_requests enable row level security;

create policy "Users can view own ai_requests" on public.ai_requests
  for select using (auth.uid() = user_id);

create policy "Service role can insert ai_requests" on public.ai_requests
  for insert with check (auth.uid() = user_id);

create policy "Admins can view all ai_requests" on public.ai_requests
  for select using (public.is_admin());

-- Indexes
create index if not exists idx_ai_requests_user_id on public.ai_requests(user_id);
create index if not exists idx_ai_requests_created_at on public.ai_requests(created_at desc);
create index if not exists idx_ai_requests_feature on public.ai_requests(feature_type);
create index if not exists idx_ai_requests_status on public.ai_requests(status);
create index if not exists idx_ai_requests_input_hash on public.ai_requests(input_hash) where input_hash is not null;
