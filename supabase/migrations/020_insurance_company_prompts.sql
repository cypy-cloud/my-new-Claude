-- Per-insurance-company AI prompt customization: lets each company have its own
-- tone, compliance guidance, forbidden/preferred expressions, and disclaimer text
-- on top of the base feature prompts in prompt_versions / lib/ai-core fallback templates.

create table if not exists public.insurance_companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  company_type text not null default 'other' check (company_type in ('life', 'non_life', 'ga', 'other')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.company_prompt_profiles (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.insurance_companies(id) on delete cascade,
  feature_type text not null check (feature_type in (
    'sms_message', 'sales_script', 'pdf_explanation',
    'newsletter', 'blog_content', 'crm_followup', 'objection_handling', 'product_summary'
  )),
  tone_guide text,
  compliance_guide text,
  forbidden_expressions text[] not null default '{}',
  preferred_expressions text[] not null default '{}',
  disclaimer_template text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one active profile per (company, feature) at a time
create unique index if not exists idx_company_prompt_profiles_active
  on public.company_prompt_profiles(company_id, feature_type)
  where is_active;

create index if not exists idx_company_prompt_profiles_company on public.company_prompt_profiles(company_id);

drop trigger if exists company_prompt_profiles_updated_at on public.company_prompt_profiles;
create trigger company_prompt_profiles_updated_at before update on public.company_prompt_profiles
  for each row execute function public.set_updated_at();

alter table public.insurance_companies enable row level security;
alter table public.company_prompt_profiles enable row level security;

drop policy if exists "Authenticated users can read active companies" on public.insurance_companies;
create policy "Authenticated users can read active companies" on public.insurance_companies
  for select using (auth.role() = 'authenticated');

drop policy if exists "Super admins can manage companies" on public.insurance_companies;
create policy "Super admins can manage companies" on public.insurance_companies
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

drop policy if exists "Authenticated users can read active company prompts" on public.company_prompt_profiles;
create policy "Authenticated users can read active company prompts" on public.company_prompt_profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "Super admins can manage company prompts" on public.company_prompt_profiles;
create policy "Super admins can manage company prompts" on public.company_prompt_profiles
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

-- Seed common Korean insurance companies (idempotent)
insert into public.insurance_companies (name, company_type)
values
  ('메리츠화재', 'non_life'),
  ('삼성화재', 'non_life'),
  ('현대해상', 'non_life'),
  ('DB손해보험', 'non_life'),
  ('KB손해보험', 'non_life'),
  ('한화생명', 'life'),
  ('교보생명', 'life'),
  ('삼성생명', 'life')
on conflict (name) do nothing;
