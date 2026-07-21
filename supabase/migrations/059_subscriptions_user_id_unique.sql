-- activateSubscription()의 upsert(onConflict: 'user_id')가 정상 동작하려면
-- subscriptions.user_id에 UNIQUE 제약이 필요한데, 032_billing_subscriptions.sql에는
-- 일반 인덱스만 생성되고 UNIQUE 제약이 누락되어 있었음. 지금까지 activateSubscription()을
-- 통한 실제 첫 구독 활성화(실결제)가 한 번도 성공적으로 실행된 적이 없어(테스트는 항상
-- 어드민 플랜 강제 변경으로 우회) 발견되지 못했던 버그 (2026-07-21 실결제 테스트 중 발견).

-- 혹시 이미 같은 user_id로 중복된 행이 있다면 가장 최근 것만 남기고 정리
-- (지금까지 subscriptions insert는 activateSubscription()의 upsert 경로가 유일해
--  정상적으로는 중복이 없어야 하지만, 안전하게 먼저 정리 후 제약을 건다)
delete from public.subscriptions a
using public.subscriptions b
where a.user_id = b.user_id
  and a.id <> b.id
  and (a.updated_at, a.id) < (b.updated_at, b.id);

alter table public.subscriptions
  add constraint subscriptions_user_id_key unique (user_id);
