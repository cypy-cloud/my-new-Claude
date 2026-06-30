export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          name: string | null
          email: string
          phone: string | null
          company_name: string | null
          insurance_company: string | null
          plan_type: 'free' | 'basic' | 'pro' | 'premium'
          role: 'user' | 'manager' | 'admin' | 'super_admin'
          team_id: string | null
          status: 'active' | 'suspended' | 'deleted'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string | null
          email: string
          phone?: string | null
          company_name?: string | null
          insurance_company?: string | null
          plan_type?: 'free' | 'basic' | 'pro' | 'premium'
          role?: 'user' | 'manager' | 'admin' | 'super_admin'
          team_id?: string | null
          status?: 'active' | 'suspended' | 'deleted'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      teams: {
        Row: {
          id: string
          team_name: string
          owner_user_id: string
          organization_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_name: string
          owner_user_id: string
          organization_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['teams']['Insert']>
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'owner' | 'manager' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: 'owner' | 'manager' | 'member'
          joined_at?: string
        }
        Update: Partial<Database['public']['Tables']['team_members']['Insert']>
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
        Insert: {
          id?: string
          user_id: string
          plan_id?: string
          status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          payment_provider?: string | null
          payment_customer_id?: string | null
          payment_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
      }
      request_locks: {
        Row: {
          id: string
          user_id: string
          feature_type: 'ai_message' | 'ai_script' | 'ai_document'
          input_hash: string
          status: 'processing' | 'completed' | 'failed'
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature_type: 'ai_message' | 'ai_script' | 'ai_document'
          input_hash: string
          status?: 'processing' | 'completed' | 'failed'
          created_at?: string
          expires_at?: string
        }
        Update: Partial<Database['public']['Tables']['request_locks']['Insert']>
      }
      ai_requests: {
        Row: {
          id: string
          user_id: string
          feature_type: 'ai_message' | 'ai_script' | 'ai_document'
          provider: string
          model: string
          prompt_version: string | null
          input_hash: string | null
          input_tokens: number
          output_tokens: number
          estimated_cost: number
          status: 'success' | 'failed' | 'cached'
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature_type: 'ai_message' | 'ai_script' | 'ai_document'
          provider: string
          model: string
          prompt_version?: string | null
          input_hash?: string | null
          input_tokens?: number
          output_tokens?: number
          estimated_cost?: number
          status: 'success' | 'failed' | 'cached'
          error_message?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['ai_requests']['Insert']>
      }
      usage_records: {
        Row: {
          id: string
          user_id: string
          usage_month: string
          sms_count: number
          script_count: number
          pdf_upload_count: number
          pdf_analysis_count: number
          storage_used_mb: number
          ai_token_input: number
          ai_token_output: number
          ai_cost_estimate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          usage_month: string
          sms_count?: number
          script_count?: number
          pdf_upload_count?: number
          pdf_analysis_count?: number
          storage_used_mb?: number
          ai_token_input?: number
          ai_token_output?: number
          ai_cost_estimate?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['usage_records']['Insert']>
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
        Insert: {
          id?: string
          user_id: string
          feature: 'ai_message' | 'ai_script' | 'ai_document'
          action: string
          ai_provider?: string | null
          ai_model?: string | null
          input_tokens?: number
          output_tokens?: number
          cost_usd?: number
          response_cached?: boolean
          duration_ms?: number | null
          metadata?: Json | null
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
        Insert: {
          id?: string
          user_id: string
          year_month: string
          ai_message_count?: number
          ai_script_count?: number
          ai_document_count?: number
          total_input_tokens?: number
          total_output_tokens?: number
          total_cost_usd?: number
          updated_at?: string
        }
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
          storage_days: number
          priority_processing: boolean
          team_sharing: boolean
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          price?: number
          currency?: string
          interval?: string
          ai_message_limit?: number
          ai_script_limit?: number
          ai_document_limit?: number
          max_file_size_mb?: number
          max_members?: number
          storage_days?: number
          priority_processing?: boolean
          team_sharing?: boolean
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['plans']['Insert']>
      }
      ai_cache: {
        Row: {
          id: string
          user_id: string | null
          feature_type: 'ai_message' | 'ai_script' | 'ai_document'
          input_hash: string
          output_text: string
          prompt_version: string | null
          provider: string
          model: string
          input_tokens: number
          output_tokens: number
          hit_count: number
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          feature_type: 'ai_message' | 'ai_script' | 'ai_document'
          input_hash: string
          output_text: string
          prompt_version?: string | null
          provider: string
          model: string
          input_tokens?: number
          output_tokens?: number
          hit_count?: number
          expires_at: string
          created_at?: string
        }
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
        Insert: {
          id?: string
          title: string
          content: string
          type?: 'info' | 'warning' | 'maintenance' | 'feature'
          is_published?: boolean
          target_plan?: string | null
          published_at?: string | null
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['announcements']['Insert']>
      }
      feedback: {
        Row: {
          id: string
          user_id: string
          category: 'bug' | 'feature_request' | 'improvement' | 'billing' | 'other'
          title: string | null
          content: string
          status: 'open' | 'reviewing' | 'planned' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high'
          admin_memo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: 'bug' | 'feature_request' | 'improvement' | 'billing' | 'other'
          title?: string | null
          content: string
          status?: 'open' | 'reviewing' | 'planned' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high'
          admin_memo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['feedback']['Insert']>
      }
      user_onboarding: {
        Row: {
          id: string
          user_id: string
          completed_intro: boolean
          completed_sms_tutorial: boolean
          completed_script_tutorial: boolean
          completed_pdf_tutorial: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          completed_intro?: boolean
          completed_sms_tutorial?: boolean
          completed_script_tutorial?: boolean
          completed_pdf_tutorial?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_onboarding']['Insert']>
      }
      uploaded_files: {
        Row: {
          id: string
          user_id: string
          original_file_name: string
          storage_path: string | null
          file_size_mb: number
          file_type: string
          extracted_text: string | null
          summary_text: string | null
          status: 'uploaded' | 'processing' | 'completed' | 'failed' | 'deleted' | 'original_expired'
          delete_after: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          original_file_name: string
          storage_path?: string | null
          file_size_mb?: number
          file_type?: string
          extracted_text?: string | null
          summary_text?: string | null
          status?: 'uploaded' | 'processing' | 'completed' | 'failed' | 'deleted' | 'original_expired'
          delete_after?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['uploaded_files']['Insert']>
      }
      generated_outputs: {
        Row: {
          id: string
          user_id: string
          type: 'sms' | 'script' | 'pdf_explanation'
          title: string
          input_data: Json
          output_text: string
          prompt_version: string | null
          ai_provider: string | null
          model: string | null
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'sms' | 'script' | 'pdf_explanation'
          title: string
          input_data?: Json
          output_text: string
          prompt_version?: string | null
          ai_provider?: string | null
          model?: string | null
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['generated_outputs']['Insert']>
      }
      event_logs: {
        Row: {
          id: string
          user_id: string | null
          event_name: string
          feature_type: string | null
          page_path: string | null
          metadata: Json | null
          device_type: string | null
          browser: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_name: string
          feature_type?: string | null
          page_path?: string | null
          metadata?: Json | null
          device_type?: string | null
          browser?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['event_logs']['Insert']>
      }
      prompt_versions: {
        Row: {
          id: string
          feature_type: 'sms' | 'script' | 'pdf_explanation'
          version: string
          title: string | null
          system_prompt: string | null
          user_prompt_template: string
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          feature_type: 'sms' | 'script' | 'pdf_explanation'
          version: string
          title?: string | null
          system_prompt?: string | null
          user_prompt_template: string
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['prompt_versions']['Insert']>
      }
      backup_logs: {
        Row: {
          id: string
          user_id: string | null
          backup_type: 'user_zip' | 'admin_csv' | 'system'
          status: 'processing' | 'completed' | 'failed'
          file_path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          backup_type: 'user_zip' | 'admin_csv' | 'system'
          status?: 'processing' | 'completed' | 'failed'
          file_path?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['backup_logs']['Insert']>
      }
    }
    Functions: {
      increment_usage: {
        Args: { p_user_id: string; p_feature: string }
        Returns: void
      }
      increment_usage_record: {
        Args: {
          p_user_id: string
          p_feature: string
          p_token_input?: number
          p_token_output?: number
          p_cost?: number
          p_storage_mb?: number
        }
        Returns: void
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
  }
}
