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

  ai_script: `[PREP]
상담 전 준비: 고객의 기존 보험 내역 확인, 관심 상품 자료 준비, 예상 질문 목록 작성

[GREETING]
"안녕하세요, 고객님! 바쁘신 와중에 시간 내주셔서 정말 감사합니다. 오늘 편하게 이야기 나눠봐요."

[ICEBREAK]
"요즘 날씨가 많이 더운데 건강하게 지내고 계신가요? 최근에 특별히 관심 가지시는 분야가 있으신가요?"

[NEEDS]
"고객님, 현재 가장 걱정되시는 부분이 어떤 건가요? 가족 보장인지, 노후 준비인지, 아니면 다른 부분이신지요?"

[AWARENESS]
"많은 분들이 나중에 '왜 더 일찍 준비하지 않았을까' 하고 후회하시더라고요. 지금 이 시점이 정말 좋은 타이밍이에요."

[PRODUCT]
"고객님 상황에 딱 맞는 상품을 준비했는데요, 월 부담 없이 최대한의 보장을 받으실 수 있는 플랜이에요."

[PERSONA]
"비슷한 상황이신 고객님도 처음엔 망설이셨는데, 지금은 정말 잘 결정했다고 하시더라고요."

[OBJECTION]
"보험료가 부담스러우시다면, 최소한의 금액으로 핵심 보장만 챙기는 방법도 있어요. 같이 살펴볼까요?"

[CLOSING]
"오늘 말씀드린 내용 어떻게 생각하세요? 좋으시다면 오늘 바로 진행해드릴 수도 있고, 조금 더 생각해보실 시간도 드릴게요."

[FOLLOWUP]
"다음 주에 한 번 더 연락드려도 될까요? 궁금한 점 있으시면 언제든지 편하게 연락 주세요!"`,

  ai_document: `[SUMMARY]
이 상품은 사망, 암 진단, 수술 등 주요 위험을 폭넓게 보장하는 비갱신형 보험입니다. 한번 가입하면 보험료가 오르지 않아 장기적으로 안정적입니다.

[COVERAGE]
- 사망 보험금: 가입금액의 100%
- 암 진단금: 가입금액의 50%
- 수술비: 1회당 최대 200만원
- 보험료 납입 면제 특약 포함
- 만기환급형 선택 가능

[MISCONCEPTIONS]
- "가입하면 모든 질병이 다 보장된다"는 오해가 많지만, 약관상 보장 범위와 면책사항을 반드시 확인해야 합니다.
- 비갱신형이라고 해서 모든 특약이 비갱신인 것은 아닙니다.

[QNA]
Q. 가입 후 바로 보장받을 수 있나요?
A. 일부 보장은 90일 대기기간이 적용됩니다.

Q. 중도에 해지하면 환급금이 있나요?
A. 만기환급형 선택 시 환급금이 발생할 수 있습니다.

[AGENT_SCRIPT]
"고객님, 이 상품은 한번 가입하면 보험료가 오르지 않는 비갱신형이라 장기적으로 유리합니다. 다만 가입 초기 90일 대기기간이 있다는 점 꼭 안내드릴게요."`,
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
