"use client"

import { useState, useRef, useCallback } from 'react'

export type AIGenerateStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AIGenerateState {
  status: AIGenerateStatus
  result: string
  cached: boolean
  remaining: number
  error: string | null
  provider: string | null
}

interface UseAIGenerateOptions {
  endpoint: string
  minIntervalMs?: number  // min ms between requests (debounce guard), default 1000
  maxRetries?: number     // client-side retry count on network error, default 1
}

interface GenerateParams {
  [key: string]: unknown
  forceRegenerate?: boolean
}

export function useAIGenerate(
  initialRemaining: number,
  opts: UseAIGenerateOptions
) {
  const { endpoint, minIntervalMs = 1000, maxRetries = 1 } = opts

  const [state, setState] = useState<AIGenerateState>({
    status: 'idle',
    result: '',
    cached: false,
    remaining: initialRemaining,
    error: null,
    provider: null,
  })

  // Track in-flight request to prevent double-submission
  const inFlightRef = useRef(false)
  // Track last request time for rapid-click throttle
  const lastRequestRef = useRef(0)

  const generate = useCallback(async (params: GenerateParams) => {
    // 1. Rapid-click guard
    const now = Date.now()
    if (now - lastRequestRef.current < minIntervalMs && !params.forceRegenerate) {
      return
    }

    // 2. In-flight guard (already loading)
    if (inFlightRef.current) return

    inFlightRef.current = true
    lastRequestRef.current = now

    setState(prev => ({ ...prev, status: 'loading', error: null }))

    let attempt = 0
    while (attempt <= maxRetries) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        })

        const data = await res.json()

        if (!res.ok) {
          // 409 duplicate — silent, don't retry
          if (res.status === 409) {
            setState(prev => ({ ...prev, status: 'idle', error: null }))
            break
          }
          // 429 limit exceeded — don't retry
          if (res.status === 429) {
            setState(prev => ({
              ...prev,
              status: 'error',
              error: data.error ?? '한도를 초과했습니다.',
            }))
            break
          }
          throw new Error(data.error ?? `HTTP ${res.status}`)
        }

        setState({
          status: 'success',
          result: data.text,
          cached: data.cached ?? false,
          remaining: data.remaining ?? 0,
          error: null,
          provider: data.provider ?? null,
        })
        break

      } catch (err) {
        attempt++
        if (attempt > maxRetries) {
          setState(prev => ({
            ...prev,
            status: 'error',
            error: err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.',
          }))
        } else {
          // Wait before retry
          await new Promise(r => setTimeout(r, 500 * attempt))
        }
      }
    }

    inFlightRef.current = false
  }, [endpoint, minIntervalMs, maxRetries])

  const reset = useCallback(() => {
    setState(prev => ({ ...prev, status: 'idle', result: '', error: null }))
  }, [])

  return { state, generate, reset }
}
