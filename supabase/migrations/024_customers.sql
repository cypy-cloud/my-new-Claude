-- Basic CRM structure: lets an agent store their own customers and use that data to
-- pre-fill the AI 문자/카톡 and AI 상담 스크립트 generators. Deliberately excludes any
-- sensitive-identifier fields (resident registration number, bank account, health
-- diagnosis details) — the app must never collect those, only general categories.

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  age_group text,
  gender text,
  job text,
  relationship_type text,
  family_status text,
  children_status text,
  income_level text,
  interest_products jsonb not null default '[]'::jsonb,
  memo text,
  tags jsonb not null default '[]'::jsonb,
  status text not null default 'prospect' check (status in ('prospect', 'active', 'dormant', 'contracted', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_user on public.customers(user_id);
create index if not exists idx_customers_user_status on public.customers(user_id, status);
create index if not exists idx_customers_user_name on public.customers(user_id, name);

alter table public.customers enable row level security;

drop policy if exists "Users manage own customers" on public.customers;
create policy "Users manage own customers" on public.customers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
