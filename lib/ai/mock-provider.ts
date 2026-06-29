import type { AIProvider, AIProviderName, GenerateOptions, AIResponse } from './types'
import { calcCost } from './types'

const MOCK_RESPONSES: Record<string, string> = {
  ai_message: `[SMS]
안녕하세요! 고객님의 소중한 미래를 함께 준비하고 싶습니다. 언제든지 편하게 연락 주세요. 감사합니다.

[KAKAO]
안녕하세요 고객님 😊 항상 건강하고 행복하시길 바랍니다! 최근 상담 내용 바탕으로 고객님께 딱 맞는 플랜을 준비했어요. 궁금한 점 있으시면 편하게 연락 주세요 🙏

[SOFT]
안녕하세요, 고객님. 바쁘신 일상 속에서도 늘 건강하게 지내시길 바랍니다. 다름이 아니라 고객님의 소중한 미래를 위해 작은 도움이 될 수 있을까 연락드렸습니다. 부담 없이 편하게 연락 주시면 감사하겠습니다.

[PERSUASIVE]
고객님, 지금이 바로 든든한 미래를 준비할 최적의 시기입니다! 고객님 상황에 맞춘 맞춤형 플랜으로 월 부담 없이 최대 보장을 받으실 수 있습니다. 오늘 바로 확인해보세요!

[FOLLOWUP]
고객님, 잘 지내고 계신가요? 언제든 연락 주세요 😊`,

  ai_script: `[상담 스크립트]

1. 오프닝
"안녕하세요, 고객님. 바쁘신 와중에 시간 내주셔서 감사합니다."

2. 니즈 파악
"최근 걱정되시는 부분이 있으신가요? 가족의 미래, 노후 준비 등 다양한 부분에서 도움을 드릴 수 있습니다."

3. 상품 소개
"고객님의 상황에 딱 맞는 플랜을 준비했습니다. 월 부담 없이 든든한 보장을 받으실 수 있어요."

4. 클로징
"오늘 말씀드린 내용 잘 검토해보시고, 궁금한 점 있으시면 언제든 연락 주세요."`,

  ai_document: `[PDF 분석 결과]

## 핵심 보장 내용
- 사망 보험금: 가입금액의 100%
- 암 진단금: 가입금액의 50%
- 수술비: 1회당 최대 200만원

## 주요 혜택
- 갱신 없는 비갱신형 상품
- 보험료 납입 면제 특약 포함
- 만기환급형 선택 가능

## 주의사항
- 90일 대기기간 적용
- 기왕증 고지 의무 있음

## 고객 설명 예시
"이 상품은 한번 가입하면 보험료가 오르지 않는 비갱신형이라 장기적으로 유리합니다."`,
}

export class MockProvider implements AIProvider {
  readonly name: AIProviderName = 'mock'
  readonly defaultModel = 'mock-model'

  async generateText(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
    await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 200))

    const feature = options?.feature ?? 'ai_message'
    const text = MOCK_RESPONSES[feature] ?? `[Mock] ${prompt.slice(0, 80)}...에 대한 AI 응답입니다.`

    const inputTokens = Math.ceil(prompt.length / 4)
    const outputTokens = Math.ceil(text.length / 4)

    return {
      text,
      usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
      model: this.defaultModel,
      provider: this.name,
      estimatedCostUsd: 0,
    }
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const response = await this.generateText(prompt, options)
    const words = response.text.split(' ')
    for (const word of words) {
      await new Promise((resolve) => setTimeout(resolve, 30))
      yield word + ' '
    }
  }
}
