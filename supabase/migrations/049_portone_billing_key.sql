-- Toss 빌링 전면 계약을 보류하고 포트원(PortOne) + 한국결제네트웍스(KPN)로 전환하면서
-- 컬럼명을 PG-중립적인 이름으로 변경한다. 카드 정보 자체는 여전히 저장하지 않는다.
alter table public.profiles
  rename column toss_billing_key to portone_billing_key;

alter table public.profiles
  rename column toss_customer_key to portone_customer_id;

alter index if exists idx_profiles_toss_customer_key rename to idx_profiles_portone_customer_id;
