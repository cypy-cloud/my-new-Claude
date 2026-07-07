-- 연간 결제 지원: 구독이 월간/연간 중 어느 주기로 결제됐는지 저장해야
-- 갱신 크론에서 올바른 금액과 기간으로 재청구할 수 있다.
alter table public.subscriptions
  add column if not exists billing_interval text not null default 'month'
    check (billing_interval in ('month', 'year'));
