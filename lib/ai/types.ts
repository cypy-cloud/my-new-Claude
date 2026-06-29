export interface AIProvider {
  name: string
  generateText(prompt: string, options?: GenerateOptions): Promise<AIResponse>
  generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string>
}

export interface GenerateOptions {
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  model?: string
}

export interface AIResponse {
  text: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  model: string
  provider: string
  cachedAt?: string
}
