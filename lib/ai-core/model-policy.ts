import type { AiCoreFeature } from './types'
import { FEATURE_CONFIG } from './types'

export type CoreProviderName = 'anthropic' | 'openai' | 'mock'

const DEFAULT_MODEL_BY_PROVIDER: Record<CoreProviderName, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  mock: 'mock-model',
}

const ENV_KEY_BY_FEATURE: Record<AiCoreFeature, string> = {
  sms_message: 'AI_PROVIDER_SMS_MESSAGE',
  sales_script: 'AI_PROVIDER_SALES_SCRIPT',
  pdf_explanation: 'AI_PROVIDER_PDF_EXPLANATION',
  newsletter: 'AI_PROVIDER_NEWSLETTER',
  blog_content: 'AI_PROVIDER_BLOG_CONTENT',
  crm_followup: 'AI_PROVIDER_CRM_FOLLOWUP',
  objection_handling: 'AI_PROVIDER_OBJECTION_HANDLING',
  product_summary: 'AI_PROVIDER_PRODUCT_SUMMARY',
}

// The 3 original features keep responding to the legacy env vars used by
// lib/ai/provider.ts (AI_PROVIDER_SMS/SCRIPT/DOCUMENT) so one setting controls
// both the existing routes and this engine identically.
const LEGACY_ENV_KEY: Partial<Record<AiCoreFeature, string>> = {
  sms_message: 'AI_PROVIDER_SMS',
  sales_script: 'AI_PROVIDER_SCRIPT',
  pdf_explanation: 'AI_PROVIDER_DOCUMENT',
}

function isCoreProviderName(value: string | undefined): value is CoreProviderName {
  return value === 'anthropic' || value === 'openai' || value === 'mock'
}

export function resolveProviderName(feature: AiCoreFeature): CoreProviderName {
  const featureEnv = process.env[ENV_KEY_BY_FEATURE[feature]]
  const legacyKey = LEGACY_ENV_KEY[feature]
  const legacyEnv = legacyKey ? process.env[legacyKey] : undefined
  const candidate = featureEnv ?? legacyEnv ?? process.env.AI_PROVIDER
  return isCoreProviderName(candidate) ? candidate : 'mock'
}

export function resolveModel(feature: AiCoreFeature, override?: string): string {
  if (override) return override
  return DEFAULT_MODEL_BY_PROVIDER[resolveProviderName(feature)]
}

export function getGenerationParams(feature: AiCoreFeature): { maxTokens: number; temperature: number } {
  const { maxTokens, temperature } = FEATURE_CONFIG[feature]
  return { maxTokens, temperature }
}
