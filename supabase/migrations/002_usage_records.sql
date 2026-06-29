-- ============================================================
-- Migration 002: Usage Records + Updated Plans
-- ============================================================

-- Update plans with correct data per spec
delete from public.plans;
insert into public.plans (id, name, price, ai_message_limit, ai_script_limit, ai_document_limit, max_file_size_mb, max_members, is_active) values
  ('free',    '무료',     0,      5,    3,   1,   5,  1, true),
  ('basic',   '기본',   1900,   50,   20,   3,  10,  1, true),
  ('pro',     '프로',   5900,  300,  100,  20,  30,  1, true),
  ('premium', '프리미엄', 9900, 1000, 300,  50,  50,  5, true);

-- Add extra columns to plans
alter table public.plans
  add column if not exists storage_days integer not null default 7,
  add column if not exists priority_processing boolean not null default false,
  add column if not exists team_sharing boolean not null default false;

update public.plans set storage_days = 7,   priority_processing = false, team_sharing = false where id = 'free';
update public.plans set storage_days = 30,  priority_processing = false, team_sharing = false where id = 'basic';
update public.plans set storage_days = 180, priority_processing = false, team_sharing = false where id = 'pro';
update public.plans set storage_days = 365, priority_processing = true,  team_sharing = true  where id = 'premium';

-- Usage records table (detailed monthly tracking)
create table if not exists public.usage_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  usage_month text not null,          -- 'YYYY-MM'
  sms_count integer not null default 0,
  script_count integer not null default 0,
  pdf_upload_count integer not null default 0,
  pdf_analysis_count integer not null default 0,
  storage_used_mb numeric(10, 2) not null default 0,
  ai_token_input integer not null default 0,
  ai_token_output integer not null default 0,
  ai_cost_estimate numeric(10, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, usage_month)
);

-- RLS
alter table public.usage_records enable row level security;
create policy "Users can view own usage records" on public.usage_records
  for select using (auth.uid() = user_id);
create policy "Users can upsert own usage records" on public.usage_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins can view all usage records" on public.usage_records
  for select using (public.is_admin());

-- Index
create index if not exists idx_usage_records_user_month on public.usage_records(user_id, usage_month);

-- updated_at trigger
create trigger usage_records_updated_at before update on public.usage_records
  for each row execute function public.set_updated_at();

-- Function: increment usage record
create or replace function public.increment_usage_record(
  p_user_id uuid,
  p_feature text,                 -- 'sms' | 'script' | 'pdf_upload' | 'pdf_analysis'
  p_token_input integer default 0,
  p_token_output integer default 0,
  p_cost numeric default 0,
  p_storage_mb numeric default 0
) returns void language plpgsql security definer as $$
declare
  v_month text := to_char(now(), 'YYYY-MM');
begin
  insert into public.usage_records (user_id, usage_month)
  values (p_user_id, v_month)
  on conflict (user_id, usage_month) do nothing;

  update public.usage_records set
    sms_count           = sms_count           + case when p_feature = 'sms'          then 1 else 0 end,
    script_count        = script_count        + case when p_feature = 'script'        then 1 else 0 end,
    pdf_upload_count    = pdf_upload_count    + case when p_feature = 'pdf_upload'    then 1 else 0 end,
    pdf_analysis_count  = pdf_analysis_count  + case when p_feature = 'pdf_analysis'  then 1 else 0 end,
    ai_token_input      = ai_token_input      + p_token_input,
    ai_token_output     = ai_token_output     + p_token_output,
    ai_cost_estimate    = ai_cost_estimate    + p_cost,
    storage_used_mb     = storage_used_mb     + p_storage_mb,
    updated_at          = now()
  where user_id = p_user_id and usage_month = v_month;
end;
$$;

-- Sync function: also keep monthly_usage in sync (legacy support)
create or replace function public.increment_usage(
  p_user_id uuid,
  p_feature text
) returns void language plpgsql security definer as $$
declare
  v_year_month text := to_char(now(), 'YYYY-MM');
begin
  insert into public.monthly_usage (user_id, year_month)
  values (p_user_id, v_year_month)
  on conflict (user_id, year_month) do nothing;

  if p_feature = 'ai_message' then
    update public.monthly_usage set ai_message_count = ai_message_count + 1, updated_at = now()
    where user_id = p_user_id and year_month = v_year_month;
  elsif p_feature = 'ai_script' then
    update public.monthly_usage set ai_script_count = ai_script_count + 1, updated_at = now()
    where user_id = p_user_id and year_month = v_year_month;
  elsif p_feature = 'ai_document' then
    update public.monthly_usage set ai_document_count = ai_document_count + 1, updated_at = now()
    where user_id = p_user_id and year_month = v_year_month;
  end if;
end;
$$;
