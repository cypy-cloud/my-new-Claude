-- Toss 빌링키(정기결제용 카드 등록 토큰) 저장 컬럼.
-- 카드 번호 자체는 저장하지 않고, Toss가 발급한 토큰(billing_key)과
-- UI 표시용 카드 뒷정보만 저장한다.
alter table public.profiles
  add column if not exists toss_billing_key text,
  add column if not exists toss_customer_key text,
  add column if not exists billing_card_last4 text,
  add column if not exists billing_card_brand text,
  add column if not exists billing_key_registered_at timestamptz;

create index if not exists idx_profiles_toss_customer_key on public.profiles(toss_customer_key) where toss_customer_key is not null;
