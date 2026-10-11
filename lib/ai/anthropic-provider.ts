import type { AIProvider, AIProviderName, GenerateOptions, AIResponse } from './types'
import { calcCost } from './types'

const DEFAULT_MODEL = 'claude-haiku-5-5'

// claude-sonnet-5 / claude-opus-4-8 / claude-haiku-5-5 등 최신 세대 모델은 temperature
// 파라미터를 더 이상 지원하지 않고 보내면 400 에러를 반환한다 (Anthropic API 확인됨).
// "Haiku로 시작하면 전부 지원"이라는 과거 가정이 Haiku 5.5에서 깨짐 — 공식 문서에
// "Omit temperature, top_p, and top_k" 명시(2026-10-11 Haiku 4.5→5.5 전환 중 확인).
// 그래서 화이트리스트 방식으로 뒤집음: 과거 레거시 모델만 명시적으로 허용.
function supportsTemperature(model: string): boolean {
  return model === 'claude-haiku-4-5-20251001'
}

// Haiku 5.5는 적응형 사고(adaptive thinking)가 기본으로 켜져 있고, 사고 토큰이 max_tokens
// 예산을 함께 소모한다 — 이 앱의 기존 maxTokens 값들(2500~5000대)은 전부 "사고 없는 순수
// 텍스트" 기준으로 튜닝돼 있어서, 그대로 두면 사고 토큰에 밀려 응답이 중간에 잘리거나
// 빈 텍스트가 반환될 위험이 있다. 이 앱의 생성 작업(문자/스크립트/PDF 설명자료 등)은
// 복잡한 추론이 필요 없는 정형화된 텍스트 생성이라, thinking을 아예 꺼서 Haiku 4.5와
// 동일하게 max_tokens 전체를 응답 텍스트에 쓰도록 한다(공식 문서: medium 이하 effort에서
// thinking:disabled 전송 가능, 2026-10-11 Haiku 4.5→5.5 전환 중 확인).
function needsThinkingDisabled(model: string): boolean {
  return model === 'claude-haiku-5-5'
}

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
        ...(supportsTemperature(model) ? { temperature: options?.temperature ?? 0.7 } : {}),
        ...(needsThinkingDisabled(model) ? { thinking: { type: 'disabled' } } : {}),
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
    const textBlock = data.content.find((block: { type: string }) => block.type === 'text')

    return {
      text: textBlock?.text ?? '',
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
        ...(supportsTemperature(model) ? { temperature: options?.temperature ?? 0.7 } : {}),
        ...(needsThinkingDisabled(model) ? { thinking: { type: 'disabled' } } : {}),
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
