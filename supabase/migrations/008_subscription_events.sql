-- subscription_events: 구독 변경 이력 및 결제 이벤트
create table if not exists public.subscription_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  event_type    text not null,  -- 'upgrade' | 'downgrade' | 'cancel' | 'payment_success' | 'payment_fail' | 'webhook'
  from_plan     text,           -- 이전 플랜
  to_plan       text,           -- 변경 후 플랜
  amount        integer,        -- 결제 금액 (KRW)
  provider      text,           -- 'mock' | 'toss' | 'stripe'
  provider_tx_id text,          -- 결제사 트랜잭션 ID
  status        text not null default 'pending',  -- 'pending' | 'completed' | 'failed' | 'refunded'
  metadata      jsonb,          -- 추가 메타데이터
  created_at    timestamptz not null default now()
);

create index if not exists subscription_events_user_id_idx on public.subscription_events(user_id);
create index if not exists subscription_events_event_type_idx on public.subscription_events(event_type);
create index if not exists subscription_events_created_at_idx on public.subscription_events(created_at desc);

alter table public.subscription_events enable row level security;

-- 사용자는 자신의 이벤트만 조회
create policy "users_read_own_events"
  on public.subscription_events for select
  using (auth.uid() = user_id);

-- 서버(service role)에서만 insert/update
create policy "service_insert_events"
  on public.subscription_events for insert
  with check (true);

create policy "service_update_events"
  on public.subscription_events for update
  using (true);
