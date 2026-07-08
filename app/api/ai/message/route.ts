import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, DuplicateRequestError } from '@/lib/ai/provider'
import { getActivePrompt, renderPrompt } from '@/lib/ai/prompts/prompt-versioning'
import { blockIfLimitExceeded, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { notifyUsageLimitWarning } from '@/lib/notifications/create-notification'
import { trackFeatureComplete } from '@/lib/analytics/track'
import { handleApiError } from '@/lib/errors/api-error-handler'
import { resolveProductCategory, buildProductCategoryAddendum } from '@/lib/ai-core/product-category'

const DISCLAIMER = '\n\n[보험 관련 유의사항] 이 메시지는 보험 상품에 대한 일반적인 안내 목적으로 작성되었습니다. 보험 상품 가입 전 약관을 반드시 확인하시기 바랍니다. 보험료 및 보장 내용은 계약 조건에 따라 달라질 수 있습니다.'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SONNET_MODEL = 'claude-sonnet-5'

// SMS, KAKAO, SOFT, FOLLOWUP → Haiku (저렴한 모델)
const HAIKU_SECTIONS = ['SMS', 'KAKAO', 'SOFT', 'FOLLOWUP'] as const
// PERSUASIVE → Sonnet (고품질 모델)
const SONNET_SECTIONS = ['PERSUASIVE'] as const

function parseOutputSections(raw: string): Record<string, string> {
  const markers = ['SMS', 'KAKAO', 'SOFT', 'PERSUASIVE', 'FOLLOWUP']
  const result: Record<string, string> = {}

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]
    const nextMarker = markers[i + 1]
    const startTag = `[${marker}]`
    const start = raw.indexOf(startTag)
    if (start === -1) continue

    const contentStart = start + startTag.length
    const end = nextMarker ? raw.indexOf(`[${nextMarker}]`, contentStart) : raw.length
    result[marker] = raw.slice(contentStart, end !== -1 ? end : raw.length).trim()
  }

  return result
}

const PERSONALITY_ADDENDUM = `
※ 중요 — "특별 보장 내용" 안에 [고객성향분석 결과]가 포함되어 있다면, 그 안의 MBTI/성향 정보를
반드시 반영하여 모든 버전의 문체·어조·설득 방식을 이 고객에게 맞게 조정하세요:
- 분석에서 제시된 "추천 첫마디"나 "핵심키워드"가 있다면 자연스럽게 녹여서 활용
- 이 고객 성향에 맞는 문장 길이·어투(예: 신중한 성향이면 근거와 수치 중심, 감성적 성향이면 공감과 스토리 중심)
- 분석에서 "절대 금물"로 명시된 표현이나 접근법은 어떤 버전에도 사용하지 말 것`

function buildHaikuPrompt(vars: Record<string, string>, categoryAddendum: string, hasAnalysis: boolean): string {
  return `당신은 보험설계사를 돕는 전문 메시지 작성 AI입니다.

고객 정보:
- 이름: ${vars.customer_name}
- 연령대: ${vars.age_group}
- 직업: ${vars.occupation}
- 관계: ${vars.relationship}
- 목적: ${vars.purpose}
- 상품 분야: ${vars.product_field}
- 선호 말투: ${vars.tone}
- 특별 보장 내용(후킹 포인트): ${vars.extra_notes}
${hasAnalysis ? PERSONALITY_ADDENDUM : ''}

아래 4가지 버전의 메시지를 반드시 마커로 구분하여 작성하세요.
모든 버전은 ① 관심 유도 → ② 공감 사례 스토리 → ③ 상품 핵심 설명 → ④ 차별화 포인트 → ⑤ 자연스러운 마무리 구조를 따를 것.

[SMS]
(LMS 문자용 - 800~1000자, 문어체·격식체, 5단계 구조 포함, 이모지 최소화)

[KAKAO]
(카카오톡용 - 800~1000자, 구어체·친근체, 이모지 3~5개 자연스럽게 삽입, 5단계 구조 포함)

[SOFT]
(부드러운 버전 - 400~500자, 공감·배려 중심, 압박감 없이 선택권 부여, 5단계 구조 포함)

[FOLLOWUP]
(후속 연락용 - 300~500자, 이전 상담 리마인드 형태로 5단계 압축, 이모지 1~2개)

작성 주의사항:
- 보험 가입 강요 금지, "무조건"·"100%" 등 과장 표현 금지
- "확정 보장"·"반드시 지급" 등 확정적 표현 금지
- 고지문은 시스템이 자동 추가하므로 포함하지 말 것${categoryAddendum ? `\n\n${categoryAddendum}` : ''}`
}

function buildSonnetPrompt(vars: Record<string, string>, categoryAddendum: string, hasAnalysis: boolean): string {
  return `당신은 보험설계사를 돕는 전문 메시지 작성 AI입니다.

고객 정보:
- 이름: ${vars.customer_name}
- 연령대: ${vars.age_group}
- 직업: ${vars.occupation}
- 관계: ${vars.relationship}
- 목적: ${vars.purpose}
- 상품 분야: ${vars.product_field}
- 선호 말투: ${vars.tone}
- 특별 보장 내용(후킹 포인트): ${vars.extra_notes}
${hasAnalysis ? PERSONALITY_ADDENDUM : ''}

아래 1가지 버전의 메시지를 반드시 마커로 구분하여 작성하세요:

[PERSUASIVE]
(강력한 스토리텔링 설득 메시지 - 반드시 700~1000자. 다음 5단계 구조를 모두 포함:
 ①후킹: 고객 연령대·직업에 딱 맞는 질문 또는 공감 오프닝 1~2줄
 ②스토리: 실제 있을 법한 3인칭 사례를 3~5문장으로 생생하게 묘사 (상황·감정·결과 포함)
 ③설명: "특별 보장 내용(후킹 포인트)" 내용이 있으면 구체적 수치·조건과 함께 반드시 언급, 없으면 보장 공백 디테일하게
 ④강조: 왜 지금 이 시점에 알아보는 것이 합리적인지 1~2문장
 ⑤마무리: 답장·문의를 부드럽게 유도하는 CTA 2~3줄
 반드시 5단계 모두 포함, 700자 이상이어야 합니다.)

작성 주의사항:
- 보험 가입 강요 금지, "무조건"·"100%" 등 과장 표현 금지
- "확정 보장"·"반드시 지급" 등 확정적 표현 금지
- 고지문은 시스템이 자동 추가하므로 포함하지 말 것${categoryAddendum ? `\n\n${categoryAddendum}` : ''}`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const {
    customerName,
    ageGroup,
    occupation,
    relationship,
    purpose,
    productField,
    categoryId,
    tone,
    length,
    extraNotes,
    forceRegenerate = false,
  } = body

  if (!purpose || !productField) {
    return NextResponse.json({ error: '목적과 상품 분야를 입력해주세요' }, { status: 400 })
  }

  try {
    await blockIfLimitExceeded(user.id, 'sms')
  } catch (err) {
    if (err instanceof UsageLimitError) {
      return NextResponse.json(
        { error: err.message, limitExceeded: true, check: err.check },
        { status: 429 }
      )
    }
    throw err
  }

  const category = await resolveProductCategory(categoryId)
  const categoryAddendum = buildProductCategoryAddendum(category) ?? ''
  const fullDisclaimer = category?.riskNotice ? `${DISCLAIMER}\n${category.riskNotice}` : DISCLAIMER

  const vars = {
    customer_name: customerName || '고객',
    age_group: ageGroup || '정보 없음',
    occupation: occupation || '정보 없음',
    relationship: relationship || '정보 없음',
    purpose,
    product_field: productField,
    tone: tone || '친근체',
    extra_notes: extraNotes || '없음',
  }

  const hasAnalysis = typeof extraNotes === 'string' && extraNotes.includes('[고객성향분석 결과]')
  const haikuPrompt = buildHaikuPrompt(vars, categoryAddendum, hasAnalysis)
  const sonnetPrompt = buildSonnetPrompt(vars, categoryAddendum, hasAnalysis)

  const baseCacheInput = {
    customerName: customerName || '',
    ageGroup, occupation, relationship, purpose, productField,
    categoryId: category?.id ?? null, tone, extraNotes,
    promptSplit: 'v1',
  }

  let haikuResult: Awaited<ReturnType<typeof generateWithAI>>
  let sonnetResult: Awaited<ReturnType<typeof generateWithAI>>

  try {
    // 병렬 호출 — Haiku(4가지) + Sonnet(설득력 버전) 동시 생성
    ;[haikuResult, sonnetResult] = await Promise.all([
      generateWithAI(haikuPrompt, {
        feature: 'ai_message',
        userId: user.id,
        model: HAIKU_MODEL,
        maxTokens: 2500,
        temperature: 0.75,
        cacheInput: { ...baseCacheInput, split: 'haiku' },
        forceRegenerate,
      }),
      generateWithAI(sonnetPrompt, {
        feature: 'ai_message',
        userId: user.id,
        model: SONNET_MODEL,
        maxTokens: 3000, // Sonnet 5의 extended thinking 소모분을 감안한 여유 마진 (1500은 드물게 거의 빈 응답으로 잘림)
        temperature: 0.75,
        cacheInput: { ...baseCacheInput, split: 'sonnet' },
        forceRegenerate,
      }),
    ])
  } catch (err) {
    if (err instanceof DuplicateRequestError) {
      return NextResponse.json({ error: err.message, duplicate: true }, { status: 409 })
    }
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'ai_message', purpose, productField } })
  }

  // 섹션 파싱 및 병합
  const sections: Record<string, string> = {
    ...parseOutputSections(haikuResult.text),
    ...parseOutputSections(sonnetResult.text),
  }

  // 고지문 추가
  const withDisclaimer: Record<string, string> = {}
  for (const [k, v] of Object.entries(sections)) {
    withDisclaimer[k] = v + fullDisclaimer
  }

  // 두 결과 모두 캐시된 경우에만 사용량 차감 건너뜀
  const wasCached = !!(haikuResult.cachedAt && sonnetResult.cachedAt)

  if (!wasCached) {
    const totalInput = haikuResult.usage.inputTokens + sonnetResult.usage.inputTokens
    const totalOutput = haikuResult.usage.outputTokens + sonnetResult.usage.outputTokens
    await incrementUsage(user.id, 'sms', {
      tokenInput: totalInput,
      tokenOutput: totalOutput,
    })
    await trackFeatureComplete('ai_message', user.id, {
      productField,
      purpose,
      cached: false,
    })
  }

  const afterCheck = await checkUsageLimit(user.id, 'sms')

  if (afterCheck.limit > 0 && afterCheck.used / afterCheck.limit >= 0.8) {
    notifyUsageLimitWarning(user.id, 'AI 문자', afterCheck.used, afterCheck.limit).catch(() => {})
  }

  return NextResponse.json({
    sections: withDisclaimer,
    rawText: `${haikuResult.text}\n\n${sonnetResult.text}`,
    cached: wasCached,
    remaining: afterCheck.remaining,
    provider: `${haikuResult.provider}+${sonnetResult.provider}`,
    model: `${HAIKU_MODEL}(×4) + ${SONNET_MODEL}(×1)`,
    promptVersion: 'split-v1',
  })
}
