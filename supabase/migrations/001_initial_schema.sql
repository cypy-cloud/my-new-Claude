-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Teams table (before profiles to allow FK)
create table public.teams (
  id uuid primary key default uuid_generate_v4(),
  team_name text not null,
  owner_user_id uuid references auth.users(id) on delete cascade not null,
  organization_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profiles table
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  name text,
  email text unique not null,
  phone text,
  company_name text,
  insurance_company text,
  plan_type text not null default 'free' check (plan_type in ('free', 'basic', 'pro', 'premium')),
  role text not null default 'user' check (role in ('user', 'manager', 'admin', 'super_admin')),
  team_id uuid references public.teams(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Team members table
create table public.team_members (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'manager', 'member')),
  joined_at timestamptz not null default now(),
  unique(team_id, user_id)
);

-- Plans table
create table public.plans (
  id text primary key,
  name text not null,
  price integer not null default 0,
  currency text not null default 'KRW',
  interval text not null default 'month',
  ai_message_limit integer not null default 5,
  ai_script_limit integer not null default 3,
  ai_document_limit integer not null default 1,
  max_file_size_mb integer not null default 5,
  max_members integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Subscriptions table (billing history)
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id text references public.plans(id) not null default 'free',
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'trialing', 'paused')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '1 month'),
  cancel_at_period_end boolean not null default false,
  payment_provider text,
  payment_customer_id text,
  payment_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Usage logs
create table public.usage_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  feature text not null check (feature in ('ai_message', 'ai_script', 'ai_document')),
  action text not null,
  ai_provider text,
  ai_model text,
  input_tokens integer default 0,
  output_tokens integer default 0,
  cost_usd numeric(10, 6) default 0,
  response_cached boolean default false,
  duration_ms integer,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Monthly usage summary
create table public.monthly_usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  year_month text not null,
  ai_message_count integer not null default 0,
  ai_script_count integer not null default 0,
  ai_document_count integer not null default 0,
  total_input_tokens integer not null default 0,
  total_output_tokens integer not null default 0,
  total_cost_usd numeric(10, 6) not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, year_month)
);

-- AI response cache
create table public.ai_cache (
  id uuid primary key default uuid_generate_v4(),
  cache_key text unique not null,
  feature text not null,
  response_text text not null,
  ai_provider text not null,
  ai_model text not null,
  input_tokens integer default 0,
  output_tokens integer default 0,
  hit_count integer not null default 0,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

-- Announcements
create table public.announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  type text not null default 'info' check (type in ('info', 'warning', 'maintenance', 'feature')),
  is_published boolean not null default false,
  target_plan text,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Feedback
create table public.feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  feature text,
  rating integer check (rating between 1 and 5),
  comment text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

-- AI prompt versions
create table public.prompt_versions (
  id uuid primary key default uuid_generate_v4(),
  feature text not null check (feature in ('ai_message', 'ai_script', 'ai_document')),
  version text not null,
  prompt_template text not null,
  is_active boolean not null default false,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(feature, version)
);

-- ============================================================
-- Seed data
-- ============================================================
insert into public.plans (id, name, price, ai_message_limit, ai_script_limit, ai_document_limit, max_file_size_mb, max_members) values
  ('free',    '무료',     0,     5,   3,   1,   5,  1),
  ('basic',   '기본',   9900,  30,  15,   5,  10,  1),
  ('pro',     '프로',  29000, 200, 100,  30,  20,  1),
  ('premium', '프리미엄', 79000, 1000, 500, 150, 50, 5);

insert into public.prompt_versions (feature, version, is_active, prompt_template, description) values
  ('ai_message', 'v1.0.0', true,
   '당신은 보험설계사를 돕는 AI 어시스턴트입니다. 고객에게 보낼 {{message_type}} 메시지를 작성해주세요.\n\n고객 정보:\n- 이름: {{customer_name}}\n- 상황: {{situation}}\n\n메시지 스타일: {{style}}\n\n자연스럽고 친근한 톤으로 작성해주세요.',
   '초기 문자/카톡 생성 프롬프트'),
  ('ai_script', 'v1.0.0', true,
   '당신은 보험설계사를 위한 상담 스크립트 전문가입니다.\n\n고객 상황:\n- 상품 유형: {{product_type}}\n- 고객 연령대: {{age_group}}\n- 상담 목적: {{purpose}}\n- 고객 우려사항: {{concerns}}\n\n위 정보를 바탕으로 자연스러운 상담 스크립트를 작성해주세요.',
   '초기 상담 스크립트 생성 프롬프트'),
  ('ai_document', 'v1.0.0', true,
   '당신은 보험 상품 설명 전문가입니다.\n\nPDF 내용:\n{{pdf_content}}\n\n다음 형식으로 작성해주세요:\n1. 핵심 보장 내용 요약\n2. 주요 혜택\n3. 보험료 및 납입 조건\n4. 주의사항\n5. 고객 설명용 예시 문구',
   '초기 PDF 문서 생성 프롬프트');

-- ============================================================
-- Enable RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_logs enable row level security;
alter table public.monthly_usage enable row level security;
alter table public.ai_cache enable row level security;
alter table public.announcements enable row level security;
alter table public.feedback enable row level security;
alter table public.prompt_versions enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
    and role in ('admin', 'super_admin')
    and status = 'active'
  )
$$;

-- Profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = user_id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = user_id);
create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());
create policy "Admins can update all profiles" on public.profiles
  for update using (public.is_admin());

-- Teams
create policy "Owners can manage their teams" on public.teams
  for all using (auth.uid() = owner_user_id);
create policy "Members can view their teams" on public.teams
  for select using (
    exists (select 1 from public.team_members tm where tm.team_id = id and tm.user_id = auth.uid())
  );
create policy "Admins can view all teams" on public.teams
  for select using (public.is_admin());

-- Team members
create policy "Users can view their team memberships" on public.team_members
  for select using (
    auth.uid() = user_id or
    exists (select 1 from public.teams t where t.id = team_id and t.owner_user_id = auth.uid())
  );
create policy "Team owners can manage members" on public.team_members
  for all using (
    exists (select 1 from public.teams t where t.id = team_id and t.owner_user_id = auth.uid())
  );

-- Subscriptions
create policy "Users can view own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "Admins can view all subscriptions" on public.subscriptions
  for select using (public.is_admin());

-- Usage logs
create policy "Users can view own usage" on public.usage_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own usage" on public.usage_logs
  for insert with check (auth.uid() = user_id);
create policy "Admins can view all usage" on public.usage_logs
  for select using (public.is_admin());

-- Monthly usage
create policy "Users can view own monthly usage" on public.monthly_usage
  for select using (auth.uid() = user_id);
create policy "Admins can view all monthly usage" on public.monthly_usage
  for select using (public.is_admin());

-- AI cache
create policy "Authenticated users can read cache" on public.ai_cache
  for select using (auth.role() = 'authenticated');

-- Announcements
create policy "Anyone can view published announcements" on public.announcements
  for select using (is_published = true);
create policy "Admins can manage announcements" on public.announcements
  for all using (public.is_admin());

-- Feedback
create policy "Users can insert own feedback" on public.feedback
  for insert with check (auth.uid() = user_id);
create policy "Users can view own feedback" on public.feedback
  for select using (auth.uid() = user_id);
create policy "Admins can view all feedback" on public.feedback
  for select using (public.is_admin());

-- Prompt versions
create policy "Authenticated users can read active prompts" on public.prompt_versions
  for select using (auth.role() = 'authenticated');
create policy "Admins can manage prompts" on public.prompt_versions
  for all using (public.is_admin());

-- ============================================================
-- Triggers & Functions
-- ============================================================

-- Auto-create profile + free subscription on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, name, phone, company_name, insurance_company)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'insurance_company'
  );

  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger teams_updated_at before update on public.teams
  for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Increment monthly usage counter
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

-- ============================================================
-- Indexes
-- ============================================================
create index idx_profiles_user_id on public.profiles(user_id);
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_email on public.profiles(email);
create index idx_profiles_team_id on public.profiles(team_id);
create index idx_profiles_status on public.profiles(status);
create index idx_team_members_team_id on public.team_members(team_id);
create index idx_team_members_user_id on public.team_members(user_id);
create index idx_usage_logs_user_id on public.usage_logs(user_id);
create index idx_usage_logs_created_at on public.usage_logs(created_at desc);
create index idx_usage_logs_feature on public.usage_logs(feature);
create index idx_monthly_usage_user_year_month on public.monthly_usage(user_id, year_month);
create index idx_ai_cache_key on public.ai_cache(cache_key);
create index idx_ai_cache_expires_at on public.ai_cache(expires_at);
create index idx_subscriptions_user_id on public.subscriptions(user_id);
