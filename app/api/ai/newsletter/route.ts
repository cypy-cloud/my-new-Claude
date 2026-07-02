import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, DuplicateRequestError } from '@/lib/ai/provider'
import { blockIfLimitExceeded, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { trackFeatureComplete } from '@/lib/analytics/track'
import { handleApiError } from '@/lib/errors/api-error-handler'

const NEWSLETTER_DISCLAIMER = `

⚠️ 법적 유의사항: 이 뉴스레터 초안은 AI가 생성한 참고용 자료입니다. 법령·세금·이율 등 수치가 포함된 경우 반드시 최신 공식 출처를 통해 직접 확인하세요. AI는 최신 뉴스나 법령 개정 내용을 정확히 알 수 없으므로, 구체적인 수치나 최신 규정은 금융감독원·생명보험협회·손해보험협회 공식 자료를 참고하세요.

📌 보험 광고 심의: 실제 발송 전 소속 회사의 컴플라이언스 확인이 필요합니다.`

function parseNewsletterSections(raw: string): Record<string, string> {
  const markers = ['TITLE', 'GREETING', 'ISSUE_1', 'ISSUE_2', 'ISSUE_3', 'CHECK_POINTS', 'CTA', 'KAKAO_SUMMARY']
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

function buildNewsletterPrompt(params: {
  targetAudience: string
  topic: string
  insuranceField: string
  seasonalIssue: string
  recentConsultingIssue: string
  tone: string
  length: string
  userProvidedInfo: string
}): string {
  const { targetAudience, topic, insuranceField, seasonalIssue, recentConsultingIssue, tone, length, userProvidedInfo } = params

  const charRange = length === '짧게' ? '800~1200자' : length === '길게' ? '2000~2500자' : '1200~1800자'

  return `당신은 보험설계사(FP)를 위한 전문 뉴스레터 작성 전문가입니다.

고객에게 발송할 보험 관련 뉴스레터 초안을 작성해주세요.

[입력 정보]
- 대상 고객층: ${targetAudience}
- 주제: ${topic}
- 보험 분야: ${insuranceField}
- 계절/시기 이슈: ${seasonalIssue || '없음'}
- 최근 상담 이슈: ${recentConsultingIssue || '없음'}
- 톤앤매너: ${tone}
- 전체 분량: ${charRange}
${userProvidedInfo ? `\n[사용자 제공 참고 자료 (이 정보만 사실로 사용하세요)]\n${userProvidedInfo}` : ''}

[⚠️ 중요 작성 원칙]
1. AI가 임의로 최신 법령, 금리, 보험료율, 통계 수치를 만들어내지 마세요
2. 구체적 수치나 최신 정보가 필요한 경우 "[확인 필요: ___]" 형태로 빈칸을 표시하세요
3. 사용자가 위에 직접 제공한 정보만 구체적 사실로 사용하세요
4. 확정적 수익·보장 약속 표현 금지 ("반드시", "무조건", "100%" 등)
5. 독자(고객)의 입장에서 유익하고 신뢰감 있게 작성하세요

다음 형식으로 정확히 출력하세요:

[TITLE]
(뉴스레터 제목 — 관심을 끄는 헤드라인, 30자 이내)

[GREETING]
(인사말 — 계절감/시기감 반영, 설계사와 고객 관계의 따뜻함, 3~4문장)

[ISSUE_1]
## (핵심 이슈 1 소제목)
(이슈 설명 — 고객에게 왜 중요한지 중심으로, 200~400자)

[ISSUE_2]
## (핵심 이슈 2 소제목)
(이슈 설명 — 실질적인 정보 위주, 200~400자)

[ISSUE_3]
## (핵심 이슈 3 소제목)
(이슈 설명 — 행동 촉구 내용 포함, 200~400자)

[CHECK_POINTS]
## 이달의 보험 점검 포인트
(고객이 지금 당장 확인해볼 보험 관련 체크리스트 3~5개, 항목별 구체적 안내)

[CTA]
(고객 행동 유도 문구 — 상담 예약, 연락 요청 등 자연스러운 CTA, 2~3문장)

[KAKAO_SUMMARY]
(카톡 발송용 짧은 요약 — 150자 이내, 핵심만 친근하게, 이모지 1~2개 포함)`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const {
    targetAudience,
    topic,
    insuranceField,
    seasonalIssue = '',
    recentConsultingIssue = '',
    tone = '전문적이고 따뜻한',
    length = '보통',
    userProvidedInfo = '',
    forceRegenerate = false,
  } = body

  if (!targetAudience || !topic || !insuranceField) {
    return NextResponse.json({ error: '대상 고객층, 주제, 보험 분야를 입력해주세요' }, { status: 400 })
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

  const prompt = buildNewsletterPrompt({ targetAudience, topic, insuranceField, seasonalIssue, recentConsultingIssue, tone, length, userProvidedInfo })
  const cacheInput = { targetAudience, topic, insuranceField, seasonalIssue, recentConsultingIssue, tone, length, userProvidedInfo }

  let result
  let sections: Record<string, string>
  try {
    result = await generateWithAI(prompt, {
      feature: 'ai_script',
      userId: user.id,
      maxTokens: 2800,
      temperature: 0.75,
      cacheInput,
      forceRegenerate,
    })
    sections = parseNewsletterSections(result.text)

    if (Object.keys(sections).length === 0 && result.cachedAt) {
      result = await generateWithAI(prompt, {
        feature: 'ai_script',
        userId: user.id,
        maxTokens: 2800,
        temperature: 0.75,
        cacheInput,
        forceRegenerate: true,
      })
      sections = parseNewsletterSections(result.text)
    }
  } catch (err) {
    if (err instanceof DuplicateRequestError) {
      return NextResponse.json({ error: err.message, duplicate: true }, { status: 409 })
    }
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'ai_newsletter', topic, insuranceField } })
  }

  const wasCached = !!result.cachedAt

  // 주의문구를 CTA 뒤에만 추가
  const withDisclaimer = { ...sections }
  if (withDisclaimer.CTA) withDisclaimer.CTA = withDisclaimer.CTA + NEWSLETTER_DISCLAIMER

  if (!wasCached) {
    await incrementUsage(user.id, 'script', {
      tokenInput: result.usage.inputTokens,
      tokenOutput: result.usage.outputTokens,
    })
    await trackFeatureComplete('ai_newsletter' as any, user.id, { insuranceField, topic, cached: false })
  }

  const afterCheck = await checkUsageLimit(user.id, 'script')

  return NextResponse.json({
    sections: withDisclaimer,
    rawText: result.text,
    cached: wasCached,
    remaining: afterCheck.remaining,
    provider: result.provider,
    model: result.model,
  })
}
