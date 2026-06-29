import type { AIProvider, AIProviderName, AIFeature, GenerateOptions, AIResponse } from './types'
import { estimateTokens } from './types'
import { MockProvider } from './mock-provider'
import { AnthropicProvider } from './anthropic-provider'
import { OpenAIProvider } from './openai-provider'
import { logAiRequest } from './ai-logger'
import { createInputHash, getCachedResponse, setCachedResponse } from './ai-cache'
import { acquireRequestLock, releaseRequestLock } from './request-lock'

// ─── Provider registry ───────────────────────────────────────────────────────

const providerCache = new Map<AIProviderName, AIProvider>()

function getProvider(name: AIProviderName): AIProvider {
  if (!providerCache.has(name)) {
    switch (name) {
      case 'anthropic': providerCache.set(name, new AnthropicProvider()); break
      case 'openai':    providerCache.set(name, new OpenAIProvider());    break
      default:          providerCache.set(name, new MockProvider());       break
    }
  }
  return providerCache.get(name)!
}

// ─── Provider selection ───────────────────────────────────────────────────────

export function selectProvider(feature?: AIFeature): AIProvider {
  let providerName: string | undefined
  if (feature) {
    const key = feature === 'ai_message' ? 'SMS' : feature === 'ai_script' ? 'SCRIPT' : 'DOCUMENT'
    providerName = process.env[`AI_PROVIDER_${key}`]
  }
  providerName ??= process.env.AI_PROVIDER ?? 'mock'
  return getProvider(providerName as AIProviderName)
}

/** @deprecated use selectProvider() */
export function getAIProvider(): AIProvider {
  return selectProvider()
}

// ─── Error handling ───────────────────────────────────────────────────────────

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: AIProviderName,
    public readonly originalError: unknown
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}

export function handleAiError(err: unknown, provider: AIProviderName): AIProviderError {
  return new AIProviderError(
    `[${provider}] ${err instanceof Error ? err.message : String(err)}`,
    provider,
    err
  )
}

export async function fallbackToMock(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
  return new MockProvider().generateText(prompt, options)
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface GenerateWithAIOptions extends GenerateOptions {
  cacheInput?: object       // object to hash for dedup/cache
  cacheTtlHours?: number    // default 24h
  forceRegenerate?: boolean // bypass cache, force new generation
  skipFallback?: boolean    // throw instead of falling back to mock
  maxRetries?: number       // retry count on failure (default 2)
}

export async function generateWithAI(
  prompt: string,
  options: GenerateWithAIOptions = {}
): Promise<AIResponse> {
  const {
    feature,
    userId,
    cacheInput,
    cacheTtlHours = 24,
    forceRegenerate = false,
    skipFallback = false,
    maxRetries = 2,
    ...genOpts
  } = options

  // 1. Compute cache/lock key
  const inputHash = cacheInput ? createInputHash(cacheInput) : undefined

  // 2. Cache check (skip if forceRegenerate)
  if (!forceRegenerate && inputHash && feature) {
    const cached = await getCachedResponse(inputHash, feature, userId).catch(() => null)
    if (cached) {
      if (userId && feature) {
        await logAiRequest({
          userId, feature,
          provider: cached.provider as AIProviderName,
          model: cached.model,
          inputTokens: cached.usage.inputTokens,
          outputTokens: cached.usage.outputTokens,
          estimatedCostUsd: 0,
          status: 'cached',
          promptVersion: genOpts.promptVersion,
          inputHash,
        })
      }
      return cached
    }
  }

  // 3. Acquire request lock (prevents duplicate concurrent requests)
  let lockAcquired = false
  if (userId && feature && inputHash) {
    try {
      const lock = await acquireRequestLock(userId, feature, inputHash)
      lockAcquired = lock.acquired
      if (!lock.acquired) {
        throw new DuplicateRequestError(
          '동일한 요청이 처리 중입니다. 잠시 후 다시 시도해주세요.'
        )
      }
    } catch (err) {
      if (err instanceof DuplicateRequestError) throw err
      // Table may not exist yet — proceed without lock
      console.warn('[ai] request lock skipped:', err)
    }
  }

  // 4. Generate with retries
  const provider = selectProvider(feature)
  let response: AIResponse | undefined
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      response = await provider.generateText(prompt, { ...genOpts, feature })
      break
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        await sleep(300 * Math.pow(2, attempt)) // 300ms, 600ms
      }
    }
  }

  // 5. Handle final failure
  if (!response) {
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError)

    if (userId && feature && inputHash && lockAcquired) {
      await releaseRequestLock(userId, feature, inputHash, 'failed').catch(() => {})
      await logAiRequest({
        userId, feature,
        provider: provider.name,
        model: provider.defaultModel,
        inputTokens: estimateTokens(prompt),
        outputTokens: 0,
        estimatedCostUsd: 0,
        status: 'failed',
        errorMessage,
        promptVersion: genOpts.promptVersion,
        inputHash,
      })
    }

    if (skipFallback) throw handleAiError(lastError, provider.name)

    console.warn(`[ai] ${provider.name} failed after ${maxRetries + 1} attempts, falling back to mock`)
    response = await fallbackToMock(prompt, { ...genOpts, feature })
  }

  // 6. Log success + release lock
  if (userId && feature) {
    await logAiRequest({
      userId, feature,
      provider: response.provider as AIProviderName,
      model: response.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      estimatedCostUsd: response.estimatedCostUsd,
      status: 'success',
      promptVersion: genOpts.promptVersion,
      inputHash,
    }).catch(() => {})
    if (inputHash && lockAcquired) await releaseRequestLock(userId, feature, inputHash, 'completed').catch(() => {})
  }

  // 7. Save to cache
  if (inputHash && feature) {
    await setCachedResponse(inputHash, feature, response, cacheTtlHours).catch(() => {})
  }

  return response
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export class DuplicateRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DuplicateRequestError'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
