-- Extra credits: 10건 추가권 구매 및 잔여 크레딧 관리
-- 크레딧은 구매일로부터 30일 후 만료

create table if not exists user_extra_credits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- 'script' | 'sms' | 'followup' | 'all' (공통)
  feature_type  text not null default 'all',
  credits       integer not null check (credits >= 0),
  -- 구매 정보
  order_id      text unique,           -- Toss 주문 ID
  payment_key   text,                  -- Toss 결제 키
  amount_paid   integer not null,      -- 실제 결제 금액 (원)
  pack_size     integer not null default 10, -- 구매한 건수
  -- 만료
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);

-- 유저별 유효한 크레딧 조회 인덱스
create index if not exists idx_extra_credits_user_active
  on user_extra_credits (user_id, feature_type, expires_at)
  where credits > 0;

-- RLS
alter table user_extra_credits enable row level security;

create policy "users view own credits"
  on user_extra_credits for select
  using (auth.uid() = user_id);

-- 서비스 롤만 insert/update 가능 (API에서 service role 사용)
create policy "service role manage credits"
  on user_extra_credits for all
  using (auth.role() = 'service_role');

-- 만료된 크레딧 자동 정리 함수 (선택적 cron)
create or replace function cleanup_expired_credits()
returns void language sql security definer as $$
  delete from user_extra_credits
  where expires_at < now() and credits = 0;
$$;
