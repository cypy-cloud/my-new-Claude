import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI } from '@/lib/ai/provider'
import { blockIfLimitExceeded, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { handleApiError } from '@/lib/errors/api-error-handler'

const OBJECTION_TYPES: Record<string, string> = {
  expensive: '보험료가 너무 비쌉니다',
  already_have: '이미 보험이 있어요',
  not_needed: '보험이 필요 없어요',
  later: '나중에 생각해볼게요',
  think_about: '좀 더 생각해봐야 해요',
  spouse: '배우자와 상의해야 해요',
  distrust: '보험은 믿기 어렵습니다',
  young: '아직 젊어서 괜찮아요',
  no_money: '지금 여유 자금이 없어요',
  bad_experience: '예전에 안 좋은 경험이 있어요',
  custom: '',
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const {
    objectionType,
    customObjection,
    productType,
    customerContext,
    agentStyle = '친근하고 전문적',
  } = body

  if (!objectionType) {
    return NextResponse.json({ error: '거절 유형을 선택해주세요' }, { status: 400 })
  }
  if (!productType) {
    return NextResponse.json({ error: '상품 유형을 입력해주세요' }, { status: 400 })
  }

  try {
    await blockIfLimitExceeded(user.id, 'script')
  } catch (err) {
    if (err instanceof UsageLimitError) {
      return NextResponse.json(
        { error: err.message, limitExceeded: true, check: err.check },
        { status: 429 }
      )
    }
    throw err
  }

  const objectionText = objectionType === 'custom'
    ? customObjection
    : OBJECTION_TYPES[objectionType] ?? customObjection

  const contextDesc = customerContext
    ? `고객 상황: ${customerContext}`
    : '고객 상황: 별도 정보 없음 (일반적인 상황으로 가정)'

  const prompt = `당신은 20년 경력의 보험설계사 최고 멘토입니다. 실제 현장에서 수천 번의 거절을 극복한 경험을 바탕으로, 고객의 마음을 움직이는 강력한 스크립트를 작성해주세요.

## 상황 정보
- 고객 거절 멘트: "${objectionText}"
- 제안 상품: ${productType}
- ${contextDesc}
- 설계사 스타일: ${agentStyle}

## 핵심 원칙 (반드시 반영)
1. **후킹 오프닝**: 첫 문장은 고객이 "어? 그렇네?" 하고 생각을 멈추게 하는 반전 또는 공감 문장으로 시작
2. **스토리텔링**: 비슷한 상황의 실제 고객 사례나 구체적인 시나리오를 자연스럽게 녹여서 감정적 공감 유발
3. **감정→논리→행동** 흐름: 먼저 감정을 건드리고, 논리적 근거를 제시한 후, 자연스럽게 다음 단계로 유도
4. **자연스러운 대화체**: 딱딱한 설명이 아닌, 실제 마주 앉아 대화하듯 따뜻하고 진정성 있는 말투
5. **구체적 수치/예시**: 막연한 표현 대신 "월 3만원", "10년 후", "자녀가 대학 갈 때" 같은 구체적 표현 사용

## 출력 형식 (정확히 지켜주세요)

[전략1]
전략명: (핵심 접근법 5단어 이내)
상황: (이 전략이 효과적인 고객 유형 1줄)
스크립트:
"(3~6문장의 풍부하고 자연스러운 대화 스크립트. 후킹 오프닝으로 시작하고, 스토리 또는 구체적 사례를 중간에 넣고, 마지막은 부드러운 행동 유도로 마무리)"
포인트: (이 전략의 심리적 핵심 메커니즘 1줄)

[전략2]
전략명: (핵심 접근법 5단어 이내)
상황: (이 전략이 효과적인 고객 유형 1줄)
스크립트:
"(3~6문장의 풍부하고 자연스러운 대화 스크립트. 후킹 오프닝으로 시작하고, 스토리 또는 구체적 사례를 중간에 넣고, 마지막은 부드러운 행동 유도로 마무리)"
포인트: (이 전략의 심리적 핵심 메커니즘 1줄)

[전략3]
전략명: (핵심 접근법 5단어 이내)
상황: (이 전략이 효과적인 고객 유형 1줄)
스크립트:
"(3~6문장의 풍부하고 자연스러운 대화 스크립트. 후킹 오프닝으로 시작하고, 스토리 또는 구체적 사례를 중간에 넣고, 마지막은 부드러운 행동 유도로 마무리)"
포인트: (이 전략의 심리적 핵심 메커니즘 1줄)

[추가팁]
이 거절 유형을 다룰 때 설계사가 절대 해서는 안 되는 실수 1가지와, 분위기를 반전시키는 골든 타이밍 포착법을 3~4줄로 작성`

  try {
    const result = await generateWithAI(prompt, {
      feature: 'ai_script',
      userId: user.id,
      maxTokens: 2500,
      temperature: 0.75,
      cacheInput: { objectionType, customObjection, productType, customerContext, agentStyle },
    })

    const wasCached = !!result.cachedAt

    if (!wasCached) {
      await incrementUsage(user.id, 'script', {
        tokenInput: result.usage.inputTokens,
        tokenOutput: result.usage.outputTokens,
      })
    }

    const afterCheck = await checkUsageLimit(user.id, 'script')
    const strategies = parseStrategies(result.text)

    return NextResponse.json({
      strategies,
      rawText: result.text,
      objectionText,
      cached: wasCached,
      remaining: afterCheck.remaining,
    })
  } catch (err) {
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'objection' } })
  }
}

function parseStrategies(raw: string): Array<{ name: string; situation: string; script: string; point: string }> {
  const strategies: Array<{ name: string; situation: string; script: string; point: string }> = []
  const blocks = ['전략1', '전략2', '전략3']

  for (let i = 0; i < blocks.length; i++) {
    const start = raw.indexOf(`[${blocks[i]}]`)
    const end = i + 1 < blocks.length ? raw.indexOf(`[${blocks[i + 1]}]`) : raw.indexOf('[추가팁]')
    if (start === -1) continue

    const block = raw.slice(start, end !== -1 ? end : raw.length)

    const nameMatch = block.match(/전략명[:：]\s*(.+)/)
    const situationMatch = block.match(/상황[:：]\s*(.+)/)
    const scriptMatch = block.match(/스크립트[:：]\s*\n?"([^"]+)"/)
    const pointMatch = block.match(/포인트[:：]\s*(.+)/)

    strategies.push({
      name: nameMatch?.[1]?.trim() ?? `전략 ${i + 1}`,
      situation: situationMatch?.[1]?.trim() ?? '',
      script: scriptMatch?.[1]?.trim() ?? '',
      point: pointMatch?.[1]?.trim() ?? '',
    })
  }

  // fallback: return raw if parsing fails
  if (strategies.length === 0) {
    strategies.push({ name: '전략', situation: '', script: raw, point: '' })
  }

  return strategies
}
