-- 032_billing_subscriptions.sql
-- subscriptions / payments 테이블 정비
-- 기존 001_initial_schema의 subscriptions는 plans FK 구조 → 새 구조로 교체

-- ── subscriptions ──────────────────────────────────────────────────────────
-- 기존 테이블이 있으면 그대로 두고 필요한 컬럼만 추가
-- (운영 DB에 데이터가 있을 수 있으므로 drop 없이 alter)
create table if not exists public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  plan_type                 text not null default 'free',
  status                    text not null default 'active'
                              check (status in ('trialing','active','past_due','canceled','expired')),
  provider                  text not null default 'mock',
  provider_customer_id      text,
  provider_subscription_id  text,
  current_period_start      timestamptz not null default now(),
  current_period_end        timestamptz not null default (now() + interval '1 month'),
  cancel_at_period_end      boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- 기존 subscriptions 컬럼이 다른 이름일 경우를 위한 안전한 컬럼 추가
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='subscriptions' and column_name='plan_type'
  ) then
    alter table public.subscriptions add column plan_type text not null default 'free';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='subscriptions' and column_name='provider'
  ) then
    alter table public.subscriptions add column provider text not null default 'mock';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='subscriptions' and column_name='provider_customer_id'
  ) then
    alter table public.subscriptions add column provider_customer_id text;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='subscriptions' and column_name='provider_subscription_id'
  ) then
    alter table public.subscriptions add column provider_subscription_id text;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='subscriptions' and column_name='cancel_at_period_end'
  ) then
    alter table public.subscriptions add column cancel_at_period_end boolean not null default false;
  end if;
end $$;

-- 인덱스
create index if not exists subscriptions_user_id_idx   on public.subscriptions(user_id);
create index if not exists subscriptions_status_idx    on public.subscriptions(status);
create index if not exists subscriptions_provider_idx  on public.subscriptions(provider);

-- updated_at 자동 갱신 트리거
create or replace function public.set_subscriptions_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_subscriptions_updated_at();

-- RLS
alter table public.subscriptions enable row level security;

drop policy if exists "users_read_own_subscription"  on public.subscriptions;
drop policy if exists "service_manage_subscriptions" on public.subscriptions;

create policy "users_read_own_subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "service_manage_subscriptions"
  on public.subscriptions for all
  using (true) with check (true);

-- ── payments ───────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  subscription_id  uuid references public.subscriptions(id) on delete set null,
  amount           integer not null,
  currency         text not null default 'KRW',
  provider         text not null,
  provider_tx_id   text,
  status           text not null default 'pending'
                     check (status in ('pending','succeeded','failed','refunded','canceled')),
  paid_at          timestamptz,
  metadata         jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists payments_user_id_idx        on public.payments(user_id);
create index if not exists payments_subscription_id_idx on public.payments(subscription_id);
create index if not exists payments_status_idx         on public.payments(status);
create index if not exists payments_created_at_idx     on public.payments(created_at desc);

alter table public.payments enable row level security;

drop policy if exists "users_read_own_payments"  on public.payments;
drop policy if exists "service_manage_payments"  on public.payments;

create policy "users_read_own_payments"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "service_manage_payments"
  on public.payments for all
  using (true) with check (true);
