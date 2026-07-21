import type { PlanId } from './plans'

// 이용후기 이벤트 정책 — 관리자 승인 시 200자 이상 피드백 작성자에게 기본 플랜을
// 7일간 무료로 체험시켜준다. 계정당 1회만 지급 가능(profiles.review_trial_granted).
export const REVIEW_TRIAL_MIN_LENGTH = 200
export const REVIEW_TRIAL_DAYS = 7
export const REVIEW_TRIAL_PLAN: PlanId = 'basic'
