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
export type PromptVersion = Database['public']['Tables']['prompt_versions']['Row']

export type UserRole = 'user' | 'manager' | 'admin' | 'super_admin'
export type PlanType = 'free' | 'basic' | 'pro' | 'premium'
export type ProfileStatus = 'active' | 'suspended' | 'deleted'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
export type FeatureType = 'ai_message' | 'ai_script' | 'ai_document'
export type TeamMemberRole = 'owner' | 'manager' | 'member'

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
