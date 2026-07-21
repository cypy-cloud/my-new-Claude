-- 2026-07-21 코드 재검토로 발견된 심각한 보안 문제 2건을 수정한다.

-- ── 1. profiles의 민감 컬럼(plan_type, role, status 등)이 행 단위 RLS로만
-- 보호되고 컬럼 단위 제한이 없었음. "Users can update own profile" 정책은
-- auth.uid() = id 인 자신의 행을 수정할 수 있다는 것만 확인하고, 어떤 컬럼을
-- 바꿀 수 있는지는 전혀 제한하지 않는다 — 즉 로그인한 사용자가 Supabase REST API를
-- 직접 호출해 자기 자신의 plan_type을 'premium'으로, role을 'admin'으로 바꾸는 게
-- 가능한 상태였다. service_role(백엔드 admin client)에서 실행된 요청만 제한 없이
-- 통과시키고, 그 외(사용자 본인 세션)에서는 민감 컬럼을 이전 값으로 강제 되돌린다.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  new.plan_type := old.plan_type;
  new.role := old.role;
  new.status := old.status;
  new.scheduled_plan_type := old.scheduled_plan_type;
  new.scheduled_plan_date := old.scheduled_plan_date;
  new.portone_billing_key := old.portone_billing_key;
  new.portone_customer_id := old.portone_customer_id;
  new.billing_card_last4 := old.billing_card_last4;
  new.billing_card_brand := old.billing_card_brand;
  new.billing_key_registered_at := old.billing_key_registered_at;
  new.team_id := old.team_id;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileged_columns on public.profiles;
create trigger trg_protect_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- ── 2. "service_*" 이름의 RLS 정책들이 실제로는 using(true)/check(true)로
-- 전체 공개되어 있었음 — service_role은 RLS를 아예 우회하므로(BYPASSRLS) 이
-- 정책은 원래 service_role에게는 의미가 없고, 오히려 일반 인증 사용자에게
-- 구멍을 열어주는 역할만 하고 있었다. discount_codes/team_usage_loans에
-- 이미 적용된 것과 동일하게 using(false)로 바꿔 service_role 외에는 아무도
-- 접근 못 하도록 막는다(서비스롤은 어차피 이 정책과 무관하게 항상 통과).

alter policy "service_manage_subscriptions" on public.subscriptions
  using (false) with check (false);

alter policy "service_manage_payments" on public.payments
  using (false) with check (false);

alter policy "service_manage_restrictions" on public.user_restrictions
  using (false) with check (false);

alter policy "service_manage_permissions" on public.admin_permissions
  using (false) with check (false);

alter policy "service_insert_events" on public.subscription_events
  with check (false);

alter policy "service_update_events" on public.subscription_events
  using (false);

alter policy "service_insert_notifications" on public.notifications
  with check (false);

alter policy "service_insert_errors" on public.error_logs
  with check (false);

alter policy "service_insert_backup_logs" on public.backup_logs
  with check (false);

alter policy "service_write_safety_checks" on public.safety_checks
  with check (false);
