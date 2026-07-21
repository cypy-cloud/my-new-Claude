-- 이용후기 이벤트: 무료 사용자가 200자 이상 피드백(이용후기)을 남기고 관리자가 승인하면
-- 기본 플랜을 7일간 무료 체험할 수 있도록 한다. 결제가 없는 프로모션이라 subscriptions/
-- payments 테이블(실결제 이력)은 건드리지 않고 profiles.plan_type만 직접 전환한다.

alter table public.profiles
  add column if not exists trial_expires_at timestamptz,
  add column if not exists review_trial_granted boolean not null default false;

comment on column public.profiles.trial_expires_at is '이용후기 이벤트로 부여된 무료체험 만료 시각 — 지나면 cron이 free로 되돌림';
comment on column public.profiles.review_trial_granted is '이용후기 무료체험을 이미 지급받았는지 여부(계정당 1회 제한)';

alter table public.feedback
  add column if not exists trial_granted boolean not null default false;

comment on column public.feedback.trial_granted is '이 피드백을 근거로 이용후기 무료체험이 지급되었는지 여부(중복 지급 방지)';
