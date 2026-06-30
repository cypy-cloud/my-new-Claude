import { MODEL_COSTS, estimateTokens, calcCost } from '@/lib/ai/types'

export function estimateRequestCost(model: string, promptText: string, expectedOutputTokens: number): number {
  const inputTokens = estimateTokens(promptText)
  return calcCost(model, inputTokens, expectedOutputTokens)
}

export function estimateActualCost(model: string, inputTokens: number, outputTokens: number): number {
  return calcCost(model, inputTokens, outputTokens)
}

export function getModelCostTable(): typeof MODEL_COSTS {
  return MODEL_COSTS
}
