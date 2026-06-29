import type { AIProvider, GenerateOptions, AIResponse } from './types'

class MockProvider implements AIProvider {
  name = 'mock'

  async generateText(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      text: `[Mock AI Response]\n\n입력된 프롬프트: "${prompt.slice(0, 100)}..."\n\n이것은 개발용 Mock 응답입니다. 실제 AI 프로바이더를 설정하려면 .env.local에서 AI_PROVIDER를 변경하세요.`,
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      model: 'mock-model',
      provider: 'mock',
    }
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const response = await this.generateText(prompt, options)
    const words = response.text.split(' ')
    for (const word of words) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      yield word + ' '
    }
  }
}

class AnthropicProvider implements AIProvider {
  name = 'anthropic'

  async generateText(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options?.model ?? 'claude-3-haiku-20240307',
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        system: options?.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) throw new Error(`Anthropic API error: ${response.statusText}`)

    const data = await response.json()
    return {
      text: data.content[0].text,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      model: data.model,
      provider: 'anthropic',
    }
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options?.model ?? 'claude-3-haiku-20240307',
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        system: options?.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    })

    if (!response.ok || !response.body) throw new Error(`Anthropic API error: ${response.statusText}`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter((line) => line.startsWith('data: '))
      for (const line of lines) {
        const data = line.slice(6)
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta') yield parsed.delta.text
        } catch { /* ignore */ }
      }
    }
  }
}

class OpenAIProvider implements AIProvider {
  name = 'openai'

  async generateText(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: options?.model ?? 'gpt-4o-mini',
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        messages: [
          ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`)

    const data = await response.json()
    return {
      text: data.choices[0].message.content,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: data.model,
      provider: 'openai',
    }
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: options?.model ?? 'gpt-4o-mini',
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        messages: [
          ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        stream: true,
      }),
    })

    if (!response.ok || !response.body) throw new Error(`OpenAI API error: ${response.statusText}`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter((line) => line.startsWith('data: '))
      for (const line of lines) {
        const data = line.slice(6)
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices[0]?.delta?.content
          if (content) yield content
        } catch { /* ignore */ }
      }
    }
  }
}

let _provider: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (_provider) return _provider

  const providerName = process.env.AI_PROVIDER ?? 'mock'

  switch (providerName.toLowerCase()) {
    case 'anthropic':
      _provider = new AnthropicProvider()
      break
    case 'openai':
      _provider = new OpenAIProvider()
      break
    default:
      _provider = new MockProvider()
  }

  return _provider
}
