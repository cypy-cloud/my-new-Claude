import type { AIProvider, AIProviderName, GenerateOptions, AIResponse } from './types'
import { calcCost } from './types'

const DEFAULT_MODEL = 'gpt-4o-mini'

export class OpenAIProvider implements AIProvider {
  readonly name: AIProviderName = 'openai'
  readonly defaultModel = DEFAULT_MODEL

  async generateText(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
    const model = options?.model ?? this.defaultModel

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        messages: [
          ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpenAI API error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const inputTokens: number = data.usage.prompt_tokens
    const outputTokens: number = data.usage.completion_tokens

    return {
      text: data.choices[0].message.content,
      usage: { inputTokens, outputTokens, totalTokens: data.usage.total_tokens },
      model: data.model,
      provider: this.name,
      estimatedCostUsd: calcCost(data.model, inputTokens, outputTokens),
    }
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const model = options?.model ?? this.defaultModel

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        messages: [
          ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        stream: true,
      }),
    })

    if (!response.ok || !response.body) {
      throw new Error(`OpenAI stream error ${response.status}`)
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
          const content = parsed.choices[0]?.delta?.content
          if (content) yield content
        } catch { /* ignore malformed SSE */ }
      }
    }
  }
}
