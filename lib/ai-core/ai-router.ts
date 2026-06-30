import type { AIResponse } from '@/lib/ai/types'
import { estimateTokens } from '@/lib/ai/types'
import type { AiCoreRequest, AiCoreResponse } from './types'
import { loadPrompt } from './prompt-loader'
import { renderPrompt, validateVars } from './prompt-renderer'
import { parseSections } from './response-parser'
import { applySafetyFilter } from './safety-filter'
import { estimateActualCost } from './cost-estimator'
import { checkCache, saveCache, createInputHash, acquireLock, releaseLock } from './cache-manager'
import { logRequest } from './request-logger'
import { generate, generateMock, selectProvider } from './ai-provider'
import { resolveModel } from './model-policy'

export class DuplicateRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DuplicateRequestError'
  }
}

const MAX_RETRIES_DEFAULT = 2

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Main orchestration entry point. Every AI-generation feature (existing and
// future) routes through here: validate -> load prompt -> render -> cache
// check -> duplicate-request lock -> generate with retry -> mock fallback ->
// parse -> safety filter -> cost estimate -> log -> cache save.
export async function runAiRequest(req: AiCoreRequest): Promise<AiCoreResponse> {
  const {
    feature,
    userId,
    vars,
    forceRegenerate = false,
    skipFallback = false,
    maxRetries = MAX_RETRIES_DEFAULT,
  } = req

  // 4. Input validation
  validateVars(feature, vars)

  // 3. Prompt template loading + rendering
  const { template, version } = await loadPrompt(feature)
  const prompt = renderPrompt(template, vars)

  const inputHash = createInputHash({ feature, vars })
  let lockAcquired = false

  // 10. Cache check
  if (!forceRegenerate) {
    const cached = await checkCache(feature, inputHash, userId).catch(() => null)
    if (cached) {
      if (userId) {
        await logRequest({
          userId,
          feature,
          provider: cached.provider as any,
          model: cached.model,
          inputTokens: cached.inputTokens,
          outputTokens: cached.outputTokens,
          estimatedCostUsd: 0,
          status: 'cached',
          promptVersion: version,
          inputHash,
        })
      }
      const rawSections = parseSections(feature, cached.text)
      const { sections, warnings } = applySafetyFilter(rawSections)
      return {
        feature,
        rawText: cached.text,
        sections,
        cached: true,
        provider: cached.provider,
        model: cached.model,
        promptVersion: version,
        estimatedCostUsd: 0,
        usage: {
          inputTokens: cached.inputTokens,
          outputTokens: cached.outputTokens,
          totalTokens: cached.inputTokens + cached.outputTokens,
        },
        warnings,
      }
    }
  }

  // 11. Duplicate-request prevention
  if (userId) {
    try {
      lockAcquired = await acquireLock(userId, feature, inputHash)
      if (!lockAcquired) {
        throw new DuplicateRequestError('동일한 요청이 처리 중입니다. 잠시 후 다시 시도해주세요.')
      }
    } catch (err) {
      if (err instanceof DuplicateRequestError) throw err
      console.warn('[ai-core] request lock skipped:', err)
    }
  }

  // 1+2. Routed generation under the feature's model policy, retried with backoff
  const model = resolveModel(feature)
  let response: AIResponse | undefined
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      response = await generate(feature, prompt, model)
      break
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) await sleep(300 * Math.pow(2, attempt))
    }
  }

  // 13. Mock response fallback on failure
  if (!response) {
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError)

    if (userId) {
      if (lockAcquired) await releaseLock(userId, feature, inputHash, 'failed').catch(() => {})
      await logRequest({
        userId,
        feature,
        provider: selectProvider(feature).name,
        model,
        inputTokens: estimateTokens(prompt),
        outputTokens: 0,
        estimatedCostUsd: 0,
        status: 'failed',
        errorMessage,
        promptVersion: version,
        inputHash,
      })
    }

    if (skipFallback) throw lastError instanceof Error ? lastError : new Error(errorMessage)

    console.warn(`[ai-core] ${feature} generation failed after ${maxRetries + 1} attempts, falling back to mock`)
    response = await generateMock(prompt)
  }

  // 5. Response parsing
  const rawSections = parseSections(feature, response.text)

  // 6/7/8. Safety filtering (risk-expression removal, exaggeration/guarantee detection)
  const { sections, warnings } = applySafetyFilter(rawSections)

  // 9. Cost estimation
  const estimatedCostUsd =
    response.estimatedCostUsd || estimateActualCost(response.model, response.usage.inputTokens, response.usage.outputTokens)

  // 12. Request log + release lock
  if (userId) {
    await logRequest({
      userId,
      feature,
      provider: response.provider,
      model: response.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      estimatedCostUsd,
      status: 'success',
      promptVersion: version,
      inputHash,
    }).catch(() => {})
    if (lockAcquired) await releaseLock(userId, feature, inputHash, 'completed').catch(() => {})
  }

  // Cache save
  await saveCache(feature, inputHash, response, { userId, promptVersion: version }).catch(() => {})

  return {
    feature,
    rawText: response.text,
    sections,
    cached: false,
    provider: response.provider,
    model: response.model,
    promptVersion: version,
    estimatedCostUsd,
    usage: response.usage,
    warnings,
  }
}
