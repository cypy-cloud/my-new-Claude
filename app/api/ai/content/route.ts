import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, DuplicateRequestError } from '@/lib/ai/provider'
import { reserveUsage, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { trackFeatureComplete } from '@/lib/analytics/track'
import { handleApiError } from '@/lib/errors/api-error-handler'

const CONTENT_DISCLAIMER = `

⚠️ 보험 광고 심의 안내: 보험 관련 콘텐츠는 금융위원회 및 생명·손해보험협회의 광고 심의를 받아야 할 수 있습니다. 실제 게시 전 반드시 소속 회사의 컴플라이언스 팀에 확인하세요.

📌 유의사항: 확정적 수익이나 보장을 약속하는 표현은 보험업법 위반입니다. "반드시", "무조건", "100%", "확실히 받을 수 있다" 등의 표현을 삼가주세요.`

function parseContentSections(raw: string): Record<string, string> {
  const markers = ['BLOG_TITLES', 'BLOG_BODY', 'INSTAGRAM', 'FACEBOOK', 'KAKAO_CHANNEL', 'HASHTAGS']
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

function buildContentPrompt(params: {
  topic: string
  targetAudience: string
  productField: string
  contentLength: string
  tone: string
  keyMessage: string
  prohibitedExpressions: string
}): string {
  const { topic, targetAudience, productField, contentLength, tone, keyMessage, prohibitedExpressions } = params

  return `당신은 보험설계사(FP)를 위한 전문 마케팅 콘텐츠 작성 전문가입니다.

아래 정보를 바탕으로 보험 관련 블로그 및 SNS 콘텐츠를 작성해주세요.

[입력 정보]
- 주제: ${topic}
- 타깃 고객: ${targetAudience}
- 상품 분야: ${productField}
- 글 길이: ${contentLength}
- 톤앤매너: ${tone}
- 핵심 메시지: ${keyMessage}
- 금지 표현: ${prohibitedExpressions || '없음'}

[중요 준수 사항]
1. 확정적 수익이나 보장을 약속하는 표현 절대 금지 ("반드시", "무조건", "100%", "확실히" 등)
2. 과장 광고 금지 - 사실에 기반한 정보만 제공
3. 금융소비자보호법, 보험업법 준수
4. 금지 표현 목록에 있는 단어/문구 사용 금지

아래 형식으로 정확히 출력하세요:

[BLOG_TITLES]
1. (블로그 제목 1)
2. (블로그 제목 2)
3. (블로그 제목 3)
4. (블로그 제목 4)
5. (블로그 제목 5)

[BLOG_BODY]
(${contentLength === '짧게' ? '600~900자' : contentLength === '길게' ? '1500~2000자' : '900~1300자'} 분량의 블로그 본문 초안. 소제목 포함, 독자 관심을 끄는 도입부로 시작)

[INSTAGRAM]
(인스타그램용 짧은 글, 150자 이내, 감성적이고 공감 가는 톤으로)

[FACEBOOK]
(페이스북용 글, 200~300자, 정보 전달 중심, 공유하고 싶게 작성)

[KAKAO_CHANNEL]
(카카오채널용 글, 100~150자, 친근하고 행동 유도(CTA) 포함)

[HASHTAGS]
(관련 해시태그 10~15개, # 포함, 공백으로 구분)`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const {
    topic,
    targetAudience,
    productField,
    contentLength = '보통',
    tone = '전문적이고 신뢰감 있는',
    keyMessage,
    prohibitedExpressions = '',
    forceRegenerate = false,
  } = body

  if (!topic || !productField || !keyMessage) {
    return NextResponse.json({ error: '주제, 상품 분야, 핵심 메시지를 입력해주세요' }, { status: 400 })
  }

  let payerId = user.id
  try {
    payerId = (await reserveUsage(user.id, 'content')).payerId
  } catch (err) {
    if (err instanceof UsageLimitError) {
      return NextResponse.json(
        { error: err.message, limitExceeded: true, check: err.check },
        { status: 429 }
      )
    }
    throw err
  }

  const prompt = buildContentPrompt({ topic, targetAudience: targetAudience || '일반 성인', productField, contentLength, tone, keyMessage, prohibitedExpressions })

  const cacheInput = { topic, targetAudience, productField, contentLength, tone, keyMessage, prohibitedExpressions }

  let result
  let sections: Record<string, string>
  try {
    result = await generateWithAI(prompt, {
      feature: 'ai_script',
      userId: user.id,
      maxTokens: 2500,
      temperature: 0.8,
      cacheInput,
      forceRegenerate,
    })
    sections = parseContentSections(result.text)

    if (Object.keys(sections).length === 0 && result.cachedAt) {
      result = await generateWithAI(prompt, {
        feature: 'ai_script',
        userId: user.id,
        maxTokens: 2500,
        temperature: 0.8,
        cacheInput,
        forceRegenerate: true,
      })
      sections = parseContentSections(result.text)
    }
  } catch (err) {
    if (err instanceof DuplicateRequestError) {
      return NextResponse.json({ error: err.message, duplicate: true }, { status: 409 })
    }
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'ai_content', topic, productField } })
  }

  const wasCached = !!result.cachedAt

  // Append disclaimer only to blog body and channel posts (not titles/hashtags)
  const withDisclaimer: Record<string, string> = { ...sections }
  for (const key of ['BLOG_BODY', 'INSTAGRAM', 'FACEBOOK', 'KAKAO_CHANNEL']) {
    if (withDisclaimer[key]) withDisclaimer[key] = withDisclaimer[key] + CONTENT_DISCLAIMER
  }

  if (!wasCached) {
    await incrementUsage(payerId, 'content', {
      tokenInput: result.usage.inputTokens,
      tokenOutput: result.usage.outputTokens,
    })
    await trackFeatureComplete('ai_content' as any, user.id, { productField, topic, cached: false })
  }

  const afterCheck = await checkUsageLimit(user.id, 'content')

  return NextResponse.json({
    sections: withDisclaimer,
    rawText: result.text,
    cached: wasCached,
    remaining: afterCheck.remaining,
    provider: result.provider,
    model: result.model,
  })
}
