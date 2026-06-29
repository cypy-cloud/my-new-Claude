import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type UsageLog = Database['public']['Tables']['usage_logs']['Row']
export type MonthlyUsage = Database['public']['Tables']['monthly_usage']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
export type AiCache = Database['public']['Tables']['ai_cache']['Row']
export type Announcement = Database['public']['Tables']['announcements']['Row']
export type Feedback = Database['public']['Tables']['feedback']['Row']
export type PromptVersion = Database['public']['Tables']['prompt_versions']['Row']

export type UserRole = 'agent' | 'branch_manager' | 'admin' | 'super_admin'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
export type FeatureType = 'ai_message' | 'ai_script' | 'ai_document'

export interface UserWithSubscription extends Profile {
  subscription: Subscription & { plan: Plan }
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
