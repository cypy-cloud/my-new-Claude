-- 다운그레이드 예약: 말일까지 현재 플랜 유지, 다음달 1일부터 적용
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS scheduled_plan_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS scheduled_plan_date date DEFAULT NULL;

COMMENT ON COLUMN profiles.scheduled_plan_type IS '다음 달 1일부터 적용될 예약 플랜 (다운그레이드 시 사용)';
COMMENT ON COLUMN profiles.scheduled_plan_date IS '예약 플랜 적용 날짜 (보통 다음달 1일)';
