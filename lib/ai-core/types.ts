export type AiCoreFeature =
  | 'sms_message'
  | 'sales_script'
  | 'pdf_explanation'
  | 'newsletter'
  | 'blog_content'
  | 'crm_followup'
  | 'objection_handling'
  | 'product_summary'

export interface FeatureConfig {
  markers: string[]
  requiredVars: string[]
  maxTokens: number
  temperature: number
}

// Single source of truth for each feature's output section markers, required
// input variables, and generation parameters — consumed by prompt-renderer.ts
// (validation), response-parser.ts (section extraction), and model-policy.ts.
export const FEATURE_CONFIG: Record<AiCoreFeature, FeatureConfig> = {
  sms_message: {
    markers: ['SMS', 'KAKAO', 'SOFT', 'PERSUASIVE', 'FOLLOWUP'],
    requiredVars: ['customer_name', 'purpose'],
    maxTokens: 1500,
    temperature: 0.7,
  },
  sales_script: {
    markers: ['PREP', 'GREETING', 'ICEBREAK', 'NEEDS', 'AWARENESS', 'PRODUCT', 'PERSONA', 'OBJECTION', 'CLOSING', 'FOLLOWUP'],
    requiredVars: ['product_interest', 'consultation_purpose'],
    maxTokens: 2500,
    temperature: 0.7,
  },
  pdf_explanation: {
    markers: ['SUMMARY', 'COVERAGE', 'MISCONCEPTIONS', 'CHECKLIST', 'EXCLUSIONS', 'QNA', 'AGENT_SCRIPT', 'CAUTION'],
    requiredVars: ['pdf_content', 'explanation_purpose'],
    maxTokens: 3000,
    temperature: 0.6,
  },
  newsletter: {
    markers: ['SUBJECT', 'INTRO', 'BODY', 'CTA', 'CLOSING'],
    requiredVars: ['topic', 'target_audience'],
    maxTokens: 3000,
    temperature: 0.7,
  },
  blog_content: {
    markers: ['TITLE', 'INTRO', 'BODY', 'SUMMARY', 'CTA'],
    requiredVars: ['topic', 'keywords'],
    maxTokens: 3500,
    temperature: 0.7,
  },
  crm_followup: {
    markers: ['MESSAGE', 'CALL_SCRIPT', 'NEXT_STEP'],
    requiredVars: ['customer_name', 'last_contact_summary'],
    maxTokens: 1200,
    temperature: 0.6,
  },
  objection_handling: {
    markers: ['OBJECTION', 'EMPATHY', 'REBUTTAL', 'CLOSING'],
    requiredVars: ['objection_text'],
    maxTokens: 1500,
    temperature: 0.6,
  },
  product_summary: {
    markers: ['OVERVIEW', 'KEY_BENEFITS', 'CONDITIONS', 'CAUTION'],
    requiredVars: ['product_name'],
    maxTokens: 2000,
    temperature: 0.5,
  },
}

export interface SafetyWarning {
  type: 'risk_expression' | 'exaggeration' | 'definitive_guarantee'
  phrase: string
  sectionKey?: string
}

export interface AiCoreRequest {
  feature: AiCoreFeature
  userId?: string
  vars: Record<string, string>
  forceRegenerate?: boolean
  skipFallback?: boolean
  maxRetries?: number
}

export interface AiCoreResponse {
  feature: AiCoreFeature
  rawText: string
  sections: Record<string, string>
  cached: boolean
  provider: string
  model: string
  promptVersion: string
  estimatedCostUsd: number
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
  warnings: SafetyWarning[]
  companyName: string | null
}
