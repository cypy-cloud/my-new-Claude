-- 시연회(7/23, 7/24, 8/3) 참석자 대상 한정 할인코드.
-- 결제 기존 로직은 전혀 건드리지 않고, 체크아웃 시점에 선택적으로
-- 코드를 입력한 경우에만 이 테이블들을 참조하도록 별도로 추가함.

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  -- 플랜별 할인율(%). 예: {"basic": 20, "pro": 20, "premium": 30}
  discount_percent jsonb not null default '{}'::jsonb,
  -- 할인이 적용되는 결제 회차 수 (최초 결제 + 이후 자동갱신 포함)
  discount_months integer not null default 3,
  max_redemptions integer not null default 100,
  redemption_count integer not null default 0,
  valid_until timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.discount_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid references public.discount_codes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id text not null,
  discount_percent integer not null,
  months_total integer not null,
  months_used integer not null default 0,
  redeemed_at timestamptz not null default now(),
  unique(user_id)
);

create index idx_discount_redemptions_user on public.discount_code_redemptions(user_id);
create index idx_discount_redemptions_active on public.discount_code_redemptions(user_id)
  where months_used < months_total;

alter table public.discount_codes enable row level security;
alter table public.discount_code_redemptions enable row level security;

-- 서버(서비스 롤 / 관리자 클라이언트)에서만 다루는 테이블. 클라이언트 직접 접근 불가.
create policy "service role only - discount_codes" on public.discount_codes
  for all using (false);
create policy "service role only - discount_code_redemptions" on public.discount_code_redemptions
  for all using (false);

-- 요청하신 2개 코드 시딩
insert into public.discount_codes (code, discount_percent, discount_months, max_redemptions, valid_until)
values
  ('MET2026', '{"basic": 20, "pro": 20, "premium": 30}'::jsonb, 3, 100, '2026-08-10 23:59:59+09'),
  ('YM2026',  '{"basic": 20, "pro": 20, "premium": 30}'::jsonb, 3, 100, '2026-08-10 23:59:59+09')
on conflict (code) do nothing;
