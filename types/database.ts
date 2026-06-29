export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          company_name: string | null
          branch_name: string | null
          role: 'agent' | 'branch_manager' | 'admin' | 'super_admin'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          payment_provider: string | null
          payment_customer_id: string | null
          payment_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
      }
      usage_logs: {
        Row: {
          id: string
          user_id: string
          feature: 'ai_message' | 'ai_script' | 'ai_document'
          action: string
          ai_provider: string | null
          ai_model: string | null
          input_tokens: number
          output_tokens: number
          cost_usd: number
          response_cached: boolean
          duration_ms: number | null
          metadata: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['usage_logs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['usage_logs']['Insert']>
      }
      monthly_usage: {
        Row: {
          id: string
          user_id: string
          year_month: string
          ai_message_count: number
          ai_script_count: number
          ai_document_count: number
          total_input_tokens: number
          total_output_tokens: number
          total_cost_usd: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['monthly_usage']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['monthly_usage']['Insert']>
      }
      plans: {
        Row: {
          id: string
          name: string
          price: number
          currency: string
          interval: string
          ai_message_limit: number
          ai_script_limit: number
          ai_document_limit: number
          max_file_size_mb: number
          max_members: number
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['plans']['Row'], 'created_at'> & { created_at?: string }
        Update: Partial<Database['public']['Tables']['plans']['Insert']>
      }
      ai_cache: {
        Row: {
          id: string
          cache_key: string
          feature: string
          response_text: string
          ai_provider: string
          ai_model: string
          input_tokens: number
          output_tokens: number
          hit_count: number
          expires_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ai_cache']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['ai_cache']['Insert']>
      }
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          type: 'info' | 'warning' | 'maintenance' | 'feature'
          is_published: boolean
          target_plan: string | null
          published_at: string | null
          expires_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['announcements']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['announcements']['Insert']>
      }
      feedback: {
        Row: {
          id: string
          user_id: string
          feature: string | null
          rating: number | null
          comment: string | null
          status: 'pending' | 'reviewed' | 'resolved'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['feedback']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['feedback']['Insert']>
      }
      prompt_versions: {
        Row: {
          id: string
          feature: 'ai_message' | 'ai_script' | 'ai_document'
          version: string
          prompt_template: string
          is_active: boolean
          description: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['prompt_versions']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['prompt_versions']['Insert']>
      }
    }
    Functions: {
      increment_usage: {
        Args: { p_user_id: string; p_feature: string }
        Returns: void
      }
    }
  }
}
