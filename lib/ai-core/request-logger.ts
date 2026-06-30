import { createClient } from '@/lib/supabase/server'
import type { AIProviderName, AIRequestStatus } from '@/lib/ai/types'
import type { AiCoreFeature } from './types'

export interface AiCoreLog {
  userId: string
  feature: AiCoreFeature
  provider: AIProviderName
  model: string
  promptVersion?: string
  inputHash?: string
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  status: AIRequestStatus
  errorMessage?: string
}

export async function logRequest(log: AiCoreLog): Promise<void> {
  try {
    const supabase = await createClient()
    await (supabase as any).from('ai_requests').insert({
      user_id: log.userId,
      feature_type: log.feature,
      provider: log.provider,
      model: log.model,
      prompt_version: log.promptVersion ?? null,
      input_hash: log.inputHash ?? null,
      input_tokens: log.inputTokens,
      output_tokens: log.outputTokens,
      estimated_cost: log.estimatedCostUsd,
      status: log.status,
      error_message: log.errorMessage ?? null,
    })
  } catch (err) {
    // Non-critical — don't let logging failure break the request
    console.error('[ai-core] Failed to log AI request:', err)
  }
}
