import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import type { AIResponse, AIFeature } from './types'

// ─── Hash ────────────────────────────────────────────────────────────────────

export function createInputHash(input: object): string {
  return createHash('sha256')
    .update(JSON.stringify(input, Object.keys(input).sort()))
    .digest('hex')
}

/** @deprecated use createInputHash */
export const hashInput = createInputHash

// ─── Cache lookup ─────────────────────────────────────────────────────────────

export interface CachedResult {
  text: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  promptVersion: string | null
}

export async function checkCache(
  feature: AIFeature,
  inputHash: string,
  userId?: string
): Promise<CachedResult | null> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // 1. Try user-specific cache first
  if (userId) {
    const { data: userCached } = await db
      .from('ai_cache')
      .select('id, hit_count, output_text, provider, model, input_tokens, output_tokens, prompt_version')
      .eq('user_id', userId)
      .eq('feature_type', feature)
      .eq('input_hash', inputHash)
      .gt('expires_at', now)
      .maybeSingle()

    if (userCached) {
      await db.from('ai_cache')
        .update({ hit_count: ((userCached.hit_count as number) ?? 0) + 1 })
        .eq('id', userCached.id)
      return toCachedResult(userCached)
    }
  }

  // 2. Fall back to shared cache (user_id IS NULL)
  const { data: shared } = await db
    .from('ai_cache')
    .select('output_text, provider, model, input_tokens, output_tokens, prompt_version')
    .is('user_id', null)
    .eq('feature_type', feature)
    .eq('input_hash', inputHash)
    .gt('expires_at', now)
    .maybeSingle()

  return shared ? toCachedResult(shared) : null
}

function toCachedResult(row: Record<string, unknown>): CachedResult {
  return {
    text: row.output_text as string,
    provider: row.provider as string,
    model: row.model as string,
    inputTokens: (row.input_tokens as number) ?? 0,
    outputTokens: (row.output_tokens as number) ?? 0,
    promptVersion: (row.prompt_version as string) ?? null,
  }
}

// ─── Cache save ───────────────────────────────────────────────────────────────

export async function saveCache(
  feature: AIFeature,
  inputHash: string,
  response: AIResponse,
  opts: {
    userId?: string       // omit for shared cache
    promptVersion?: string
    ttlHours?: number
  } = {}
): Promise<void> {
  const supabase = await createClient()
  const expiresAt = new Date(
    Date.now() + (opts.ttlHours ?? 24) * 3_600_000
  ).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('ai_cache').upsert(
    {
      user_id: opts.userId ?? null,
      feature_type: feature,
      input_hash: inputHash,
      output_text: response.text,
      provider: response.provider,
      model: response.model,
      input_tokens: response.usage.inputTokens,
      output_tokens: response.usage.outputTokens,
      prompt_version: opts.promptVersion ?? null,
      expires_at: expiresAt,
    },
    { onConflict: 'user_id,feature_type,input_hash', ignoreDuplicates: false }
  )
}

// ─── Legacy compat (used by provider.ts) ─────────────────────────────────────

export async function getCachedResponse(
  cacheKey: string,
  feature?: AIFeature,
  userId?: string
): Promise<AIResponse | null> {
  const feat = feature ?? 'ai_message'
  const result = await checkCache(feat, cacheKey, userId)
  if (!result) return null
  return {
    text: result.text,
    usage: {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalTokens: result.inputTokens + result.outputTokens,
    },
    model: result.model,
    provider: result.provider as never,
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
  await saveCache(feature, cacheKey, response, { ttlHours })
}
