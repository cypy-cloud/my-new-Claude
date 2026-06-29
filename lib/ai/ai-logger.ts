import { createClient } from '@/lib/supabase/server'
import type { AIFeature, AIProviderName, AIRequestStatus } from './types'

export interface AiRequestLog {
  userId: string
  feature: AIFeature
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

export async function logAiRequest(log: AiRequestLog): Promise<void> {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    console.error('[ai-logger] Failed to log AI request:', err)
  }
}
