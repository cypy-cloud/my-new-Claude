import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type UsageRecord = Database['public']['Tables']['usage_records']['Row']
export type AiRequest = Database['public']['Tables']['ai_requests']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type UsageLog = Database['public']['Tables']['usage_logs']['Row']
export type MonthlyUsage = Database['public']['Tables']['monthly_usage']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
export type AiCache = Database['public']['Tables']['ai_cache']['Row']
export type Announcement = Database['public']['Tables']['announcements']['Row']
export type Feedback = Database['public']['Tables']['feedback']['Row']
export type UserOnboarding = Database['public']['Tables']['user_onboarding']['Row']
export type PromptVersion = Database['public']['Tables']['prompt_versions']['Row']

export type UserRole = 'user' | 'manager' | 'admin' | 'super_admin'
export type PlanType = 'free' | 'basic' | 'pro' | 'premium'
export type ProfileStatus = 'active' | 'suspended' | 'deleted'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
export type FeatureType = 'ai_message' | 'ai_script' | 'ai_document'
export type TeamMemberRole = 'owner' | 'manager' | 'member'

export type PromptFeatureType = 'sms' | 'script' | 'pdf_explanation' | 'crm_followup'

export const PROMPT_FEATURE_LABELS: Record<PromptFeatureType, string> = {
  sms: 'AI 문자/카톡 생성',
  script: 'AI 상담 스크립트 생성',
  pdf_explanation: 'AI PDF 설명자료 생성',
  crm_followup: 'AI 후속 연락 추천',
}

export type FeedbackCategory = 'bug' | 'feature_request' | 'improvement' | 'billing' | 'other'
export type FeedbackStatus = 'open' | 'reviewing' | 'planned' | 'resolved' | 'closed'
export type FeedbackPriority = 'low' | 'medium' | 'high'

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: '🐛 버그 신고',
  feature_request: '🚀 기능 제안',
  improvement: '🎨 개선 제안',
  billing: '💳 결제 문의',
  other: '💬 기타',
}

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: '접수됨',
  reviewing: '검토 중',
  planned: '반영 예정',
  resolved: '해결됨',
  closed: '종료됨',
}

export const FEEDBACK_PRIORITY_LABELS: Record<FeedbackPriority, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
}

export const PLAN_LABELS: Record<PlanType, string> = {
  free: '무료',
  basic: '기본',
  pro: '프로',
  premium: '프리미엄',
}

export interface DashboardStats {
  monthlyUsage: {
    aiMessage: { used: number; limit: number }
    aiScript: { used: number; limit: number }
    aiDocument: { used: number; limit: number }
  }
  recentActivity: UsageLog[]
  announcements: Announcement[]
}

export type CustomerStatus = 'prospect' | 'active' | 'dormant' | 'contracted' | 'lost'

export interface Customer {
  id: string
  name: string
  phone: string | null
  age_group: string | null
  gender: string | null
  job: string | null
  relationship_type: string | null
  family_status: string | null
  children_status: string | null
  income_level: string | null
  interest_products: string[]
  memo: string | null
  tags: string[]
  status: CustomerStatus
  created_at: string
  updated_at: string
}

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  prospect: '잠재고객',
  active: '활성고객',
  dormant: '휴면고객',
  contracted: '계약완료',
  lost: '이탈',
}

export type InteractionType = 'call' | 'meeting' | 'kakao' | 'sms' | 'contract' | 'followup' | 'memo'
export type InteractionSentiment = 'positive' | 'neutral' | 'negative' | 'unknown'

export interface CustomerInteraction {
  id: string
  customer_id: string
  interaction_type: InteractionType
  title: string
  content: string | null
  next_action: string | null
  next_action_date: string | null
  sentiment: InteractionSentiment
  created_at: string
  updated_at: string
}

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  call: '전화 상담',
  meeting: '대면 미팅',
  kakao: '카카오톡',
  sms: '문자',
  contract: '계약',
  followup: '후속 연락',
  memo: '메모',
}

export const INTERACTION_SENTIMENT_LABELS: Record<InteractionSentiment, string> = {
  positive: '긍정적',
  neutral: '보통',
  negative: '부정적',
  unknown: '미평가',
}
