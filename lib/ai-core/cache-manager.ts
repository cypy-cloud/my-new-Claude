import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import type { AIResponse } from '@/lib/ai/types'
import type { AiCoreFeature } from './types'

// ─── Hash ────────────────────────────────────────────────────────────────────

export function createInputHash(input: object): string {
  return createHash('sha256')
    .update(JSON.stringify(input, Object.keys(input).sort()))
    .digest('hex')
}

// ─── Cache lookup / save ───────────────────────────────────────────────────────

export interface CachedResult {
  text: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  promptVersion: string | null
}

export async function checkCache(
  feature: AiCoreFeature,
  inputHash: string,
  userId?: string
): Promise<CachedResult | null> {
  const supabase = await createClient()
  const db = supabase as any
  const now = new Date().toISOString()

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

export async function saveCache(
  feature: AiCoreFeature,
  inputHash: string,
  response: AIResponse,
  opts: { userId?: string; promptVersion?: string; ttlHours?: number } = {}
): Promise<void> {
  const supabase = await createClient()
  const expiresAt = new Date(Date.now() + (opts.ttlHours ?? 24) * 3_600_000).toISOString()

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

// ─── Duplicate-request prevention (request_locks) ────────────────────────────

export async function acquireLock(userId: string, feature: AiCoreFeature, inputHash: string): Promise<boolean> {
  const supabase = await createClient()
  const db = supabase as any
  const now = new Date().toISOString()

  const { data: existing } = await db
    .from('request_locks')
    .select('status')
    .eq('user_id', userId)
    .eq('feature_type', feature)
    .eq('input_hash', inputHash)
    .gt('expires_at', now)
    .maybeSingle()

  if (existing?.status === 'processing') return false

  const { error } = await db.from('request_locks').upsert(
    {
      user_id: userId,
      feature_type: feature,
      input_hash: inputHash,
      status: 'processing',
      expires_at: new Date(Date.now() + 30_000).toISOString(),
    },
    { onConflict: 'user_id,feature_type,input_hash' }
  )

  return !error
}

export async function releaseLock(
  userId: string,
  feature: AiCoreFeature,
  inputHash: string,
  status: 'completed' | 'failed' = 'completed'
): Promise<void> {
  const supabase = await createClient()
  await (supabase as any)
    .from('request_locks')
    .update({ status })
    .eq('user_id', userId)
    .eq('feature_type', feature)
    .eq('input_hash', inputHash)
}
