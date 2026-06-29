import { createClient } from '@/lib/supabase/server'
import type { AIFeature } from './types'

export type LockStatus = 'processing' | 'completed' | 'failed'

export interface LockResult {
  acquired: boolean
  existingStatus?: LockStatus
}

/**
 * Tries to acquire an exclusive lock for a (user, feature, inputHash) tuple.
 * Returns { acquired: true } if the lock was obtained.
 * Returns { acquired: false, existingStatus } if another request is already in flight.
 */
export async function acquireRequestLock(
  userId: string,
  feature: AIFeature,
  inputHash: string
): Promise<LockResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Check for active (non-expired) lock first
  const { data: existing } = await db
    .from('request_locks')
    .select('status, expires_at')
    .eq('user_id', userId)
    .eq('feature_type', feature)
    .eq('input_hash', inputHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existing?.status === 'processing') {
    return { acquired: false, existingStatus: 'processing' }
  }

  // Upsert a new processing lock (overwrite completed/failed/expired)
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

  return { acquired: !error }
}

export async function releaseRequestLock(
  userId: string,
  feature: AIFeature,
  inputHash: string,
  status: 'completed' | 'failed' = 'completed'
): Promise<void> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('request_locks')
    .update({ status })
    .eq('user_id', userId)
    .eq('feature_type', feature)
    .eq('input_hash', inputHash)
}

/**
 * Checks whether the same request is currently being processed.
 * Used before deciding to enqueue a new request.
 */
export async function preventDuplicateRequest(
  userId: string,
  feature: AIFeature,
  inputHash: string
): Promise<boolean> {
  const result = await acquireRequestLock(userId, feature, inputHash)
  return !result.acquired   // true = duplicate (blocked), false = safe to proceed
}
