-- 042: 푸시 알림 구독 테이블 + tasks 알림 설정 컬럼 추가

-- tasks 테이블에 알림 설정 컬럼 추가
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS notify_before_minutes integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notified_at timestamptz DEFAULT NULL;

-- 푸시 구독 정보 테이블
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- cron 작업에서 전체 조회 허용 (service role 사용)
-- 인덱스
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_notify ON tasks(due_date, due_time, notify_before_minutes, notified_at)
  WHERE notify_before_minutes IS NOT NULL AND notified_at IS NULL AND status = 'pending';
