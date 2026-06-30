export type AIProviderName = 'anthropic' | 'openai' | 'gemini' | 'mock'

export type AIFeature = 'ai_message' | 'ai_script' | 'ai_document' | 'ai_followup'

export type AIRequestStatus = 'success' | 'failed' | 'cached'

export interface GenerateOptions {
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  model?: string
  feature?: AIFeature
  userId?: string
  promptVersion?: string
  inputHash?: string
}

export interface AIResponse {
  text: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  model: string
  provider: AIProviderName
  estimatedCostUsd: number
  cachedAt?: string
}

export interface AIProvider {
  name: AIProviderName
  defaultModel: string
  generateText(prompt: string, options?: GenerateOptions): Promise<AIResponse>
  generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string>
}

// Cost per 1M tokens in USD
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-haiku-4-5-20251001':   { input: 0.80,  output: 4.0  },
  'claude-sonnet-4-6':            { input: 3.0,   output: 15.0 },
  'claude-opus-4-8':              { input: 15.0,  output: 75.0 },
  // OpenAI
  'gpt-4o-mini':                  { input: 0.15,  output: 0.6  },
  'gpt-4o':                       { input: 5.0,   output: 15.0 },
  // Gemini
  'gemini-1.5-flash':             { input: 0.075, output: 0.30 },
  'gemini-1.5-pro':               { input: 3.5,   output: 10.5 },
  // Mock
  'mock-model':                   { input: 0,     output: 0    },
}

export function estimateTokens(text: string): number {
  // ~4 chars per token (rough estimate)
  return Math.ceil(text.length / 4)
}

export function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] ?? { input: 3.0, output: 15.0 }
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000
}
