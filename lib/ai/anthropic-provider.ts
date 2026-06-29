import type { AIProvider, AIProviderName, GenerateOptions, AIResponse } from './types'
import { calcCost } from './types'

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

export class AnthropicProvider implements AIProvider {
  readonly name: AIProviderName = 'anthropic'
  readonly defaultModel = DEFAULT_MODEL

  async generateText(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
    const model = options?.model ?? this.defaultModel

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        system: options?.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic API error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const inputTokens: number = data.usage.input_tokens
    const outputTokens: number = data.usage.output_tokens

    return {
      text: data.content[0].text,
      usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
      model: data.model,
      provider: this.name,
      estimatedCostUsd: calcCost(data.model, inputTokens, outputTokens),
    }
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const model = options?.model ?? this.defaultModel

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        system: options?.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    })

    if (!response.ok || !response.body) {
      throw new Error(`Anthropic stream error ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6)
        if (raw === '[DONE]') return
        try {
          const parsed = JSON.parse(raw)
          if (parsed.type === 'content_block_delta') yield parsed.delta.text
        } catch { /* ignore malformed SSE */ }
      }
    }
  }
}
