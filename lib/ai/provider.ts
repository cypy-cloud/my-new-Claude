import type { AIProvider, AIProviderName, AIFeature, GenerateOptions, AIResponse } from './types'
import { estimateTokens } from './types'
import { MockProvider } from './mock-provider'
import { AnthropicProvider } from './anthropic-provider'
import { OpenAIProvider } from './openai-provider'
import { logAiRequest } from './ai-logger'
import { getCachedResponse, setCachedResponse, hashInput } from './ai-cache'

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

/**
 * Selects the AI provider for a given feature.
 * Priority: feature-specific env var → global AI_PROVIDER → mock
 *
 * Env vars:
 *   AI_PROVIDER_SMS=anthropic
 *   AI_PROVIDER_SCRIPT=openai
 *   AI_PROVIDER_DOCUMENT=anthropic
 *   AI_PROVIDER=anthropic  (default for all features)
 */
export function selectProvider(feature?: AIFeature): AIProvider {
  let providerName: string | undefined

  if (feature) {
    const featureKey = feature === 'ai_message' ? 'SMS'
      : feature === 'ai_script' ? 'SCRIPT'
      : 'DOCUMENT'
    providerName = process.env[`AI_PROVIDER_${featureKey}`]
  }

  providerName ??= process.env.AI_PROVIDER ?? 'mock'
  return getProvider(providerName as AIProviderName)
}

// Legacy export — kept for backward compatibility
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
  const message = err instanceof Error ? err.message : String(err)
  return new AIProviderError(`[${provider}] ${message}`, provider, err)
}

export async function fallbackToMock(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
  return new MockProvider().generateText(prompt, options)
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface GenerateWithAIOptions extends GenerateOptions {
  cacheInput?: object       // object to hash for cache key (omit to skip cache)
  cacheTtlHours?: number    // default 24h
  skipFallback?: boolean    // throw instead of falling back to mock
}

export async function generateWithAI(
  prompt: string,
  options: GenerateWithAIOptions = {}
): Promise<AIResponse> {
  const { feature, userId, cacheInput, cacheTtlHours = 24, skipFallback = false, ...genOpts } = options

  // 1. Cache check
  let cacheKey: string | undefined
  if (cacheInput) {
    cacheKey = hashInput(cacheInput)
    const cached = await getCachedResponse(cacheKey)
    if (cached) {
      if (userId && feature) {
        await logAiRequest({
          userId,
          feature,
          provider: cached.provider as AIProviderName,
          model: cached.model,
          inputTokens: cached.usage.inputTokens,
          outputTokens: cached.usage.outputTokens,
          estimatedCostUsd: 0,
          status: 'cached',
          promptVersion: genOpts.promptVersion,
          inputHash: cacheKey,
        })
      }
      return cached
    }
  }

  // 2. Select provider
  const provider = selectProvider(feature)

  // 3. Generate
  let response: AIResponse
  let status: 'success' | 'failed' = 'success'
  let errorMessage: string | undefined

  try {
    response = await provider.generateText(prompt, { ...genOpts, feature })
  } catch (err) {
    status = 'failed'
    errorMessage = err instanceof Error ? err.message : String(err)

    if (userId && feature) {
      await logAiRequest({
        userId,
        feature,
        provider: provider.name,
        model: provider.defaultModel,
        inputTokens: estimateTokens(prompt),
        outputTokens: 0,
        estimatedCostUsd: 0,
        status: 'failed',
        errorMessage,
        promptVersion: genOpts.promptVersion,
        inputHash: cacheKey,
      })
    }

    if (skipFallback) throw handleAiError(err, provider.name)

    console.warn(`[ai] ${provider.name} failed, falling back to mock:`, errorMessage)
    response = await fallbackToMock(prompt, { ...genOpts, feature })
  }

  // 4. Log success
  if (userId && feature && status === 'success') {
    await logAiRequest({
      userId,
      feature,
      provider: response.provider as AIProviderName,
      model: response.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      estimatedCostUsd: response.estimatedCostUsd,
      status: 'success',
      promptVersion: genOpts.promptVersion,
      inputHash: cacheKey,
    })
  }

  // 5. Store in cache
  if (cacheKey && feature && status === 'success') {
    await setCachedResponse(cacheKey, feature, response, cacheTtlHours)
  }

  return response
}
