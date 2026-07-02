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

  const prompt = `당신은 20년 경력의 보험설계사 멘토입니다. 신입 설계사가 고객의 거절에 효과적으로 대응할 수 있도록 실전적인 스크립트를 제공해주세요.

## 상황 정보
- 거절 멘트: "${objectionText}"
- 제안 상품: ${productType}
- 고객 상황: ${customerContext || '정보 없음'}
- 설계사 스타일: ${agentStyle}

## 요청 사항
위 거절에 대해 3가지 서로 다른 접근법의 극복 스크립트를 작성해주세요.

각 스크립트는 아래 형식을 정확히 지켜주세요:

[전략1]
전략명: (핵심 접근법을 5단어 이내로)
상황: (이 전략이 효과적인 고객 유형)
스크립트:
"(실제 대화처럼 자연스럽게, 2~4문장)"
포인트: (이 전략의 핵심 포인트 1줄)

[전략2]
전략명: (핵심 접근법을 5단어 이내로)
상황: (이 전략이 효과적인 고객 유형)
스크립트:
"(실제 대화처럼 자연스럽게, 2~4문장)"
포인트: (이 전략의 핵심 포인트 1줄)

[전략3]
전략명: (핵심 접근법을 5단어 이내로)
상황: (이 전략이 효과적인 고객 유형)
스크립트:
"(실제 대화처럼 자연스럽게, 2~4문장)"
포인트: (이 전략의 핵심 포인트 1줄)

[추가팁]
(이 거절 유형을 다룰 때 설계사가 특히 주의해야 할 점 2~3줄)`

  try {
    const result = await generateWithAI(prompt, {
      feature: 'ai_script',
      userId: user.id,
      maxTokens: 1500,
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
