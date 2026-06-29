import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import type { AIResponse, AIFeature } from './types'

export function hashInput(input: object): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex')
}

export async function getCachedResponse(cacheKey: string): Promise<AIResponse | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('ai_cache')
    .select('response_text, ai_provider, ai_model, input_tokens, output_tokens')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!data) return null

  return {
    text: data.response_text,
    usage: {
      inputTokens: data.input_tokens,
      outputTokens: data.output_tokens,
      totalTokens: data.input_tokens + data.output_tokens,
    },
    model: data.ai_model,
    provider: data.ai_provider,
    estimatedCostUsd: 0,
    cachedAt: new Date().toISOString(),
  }
}

export async function setCachedResponse(
  cacheKey: string,
  feature: AIFeature,
  response: AIResponse,
  ttlHours = 24
): Promise<void> {
  const supabase = await createClient()
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('ai_cache').upsert({
    cache_key: cacheKey,
    feature,
    response_text: response.text,
    ai_provider: response.provider,
    ai_model: response.model,
    input_tokens: response.usage.inputTokens,
    output_tokens: response.usage.outputTokens,
    expires_at: expiresAt,
  })
}
