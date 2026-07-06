import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI } from '@/lib/ai/provider'
import { blockIfLimitExceeded, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { handleApiError } from '@/lib/errors/api-error-handler'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const {
    customerName,
    productName,
    consultationDate,
    keyPoints,
    customerReaction,
    outcome,
    agentStyle,
    reviewPlatform,
    reviewTone,
  } = body

  if (!productName || !keyPoints) {
    return NextResponse.json({ error: '상품명과 주요 상담 내용은 필수입니다' }, { status: 400 })
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

  const prompt = `당신은 보험 상담 후기 전문 작성 도우미입니다.
보험설계사가 제공한 상담 정보를 바탕으로 고객이 직접 쓴 것처럼 자연스러운 후기를 작성해주세요.

## 상담 정보
- 고객명(익명 처리 가능): ${customerName || '익명'}
- 상품명: ${productName}
- 상담 일자: ${consultationDate || '최근'}
- 주요 상담 내용: ${keyPoints}
- 고객 반응/만족 포인트: ${customerReaction || '전반적으로 만족'}
- 상담 결과: ${outcome || '계약 완료'}
- 설계사 스타일: ${agentStyle || '친절하고 전문적'}
- 게재 플랫폼: ${reviewPlatform || '일반'}
- 후기 톤: ${reviewTone || '따뜻하고 진솔한'}

## 요청사항
위 정보를 바탕으로 후기 3가지 버전을 작성해주세요.
각 버전은 길이와 스타일이 다르게 작성해주세요.

아래 형식으로 정확하게 작성해주세요:

[버전1]
제목: (후기 제목 한 줄)
내용:
(후기 본문 — 3~4문장, 짧고 핵심적인 버전)
태그: #태그1 #태그2 #태그3

[버전2]
제목: (후기 제목 한 줄)
내용:
(후기 본문 — 5~7문장, 중간 길이의 감성적인 버전)
태그: #태그1 #태그2 #태그3

[버전3]
제목: (후기 제목 한 줄)
내용:
(후기 본문 — 8~10문장, 상세하고 신뢰감 있는 버전)
태그: #태그1 #태그2 #태그3

[작성팁]
(이 후기를 더 효과적으로 활용하는 방법 2~3가지)`

  try {
    const result = await generateWithAI(prompt, {
      feature: 'ai_script',
      userId: user.id,
      maxTokens: 3000,
      temperature: 0.8,
      cacheInput: { productName, keyPoints, customerReaction, outcome, agentStyle, reviewPlatform, reviewTone },
    })

    const wasCached = !!result.cachedAt
    if (!wasCached) {
      await incrementUsage(user.id, 'script', {
        tokenInput: result.usage.inputTokens,
        tokenOutput: result.usage.outputTokens,
      })
    }

    const afterCheck = await checkUsageLimit(user.id, 'script')
    const reviews = parseReviews(result.text)
    const tips = extractTips(result.text)

    return NextResponse.json({
      reviews,
      tips,
      cached: wasCached,
      remaining: afterCheck.remaining,
    })
  } catch (err) {
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'review_writer' } })
  }
}

function parseReviews(raw: string) {
  const reviews = []
  for (let i = 1; i <= 3; i++) {
    const tag = `버전${i}`
    const nextTag = i < 3 ? `버전${i + 1}` : '작성팁'
    const start = raw.indexOf(`[${tag}]`)
    if (start === -1) break

    const contentStart = start + tag.length + 2
    const end = raw.indexOf(`[${nextTag}]`, contentStart)
    const block = raw.slice(contentStart, end !== -1 ? end : raw.length)

    const titleMatch = block.match(/제목:\s*(.+)/)
    const contentMatch = block.match(/내용:\s*([\s\S]+?)(?=태그:|$)/)
    const tagsMatch = block.match(/태그:\s*(.+)/)

    reviews.push({
      version: i,
      title: titleMatch?.[1]?.trim() ?? '',
      content: contentMatch?.[1]?.trim() ?? '',
      tags: tagsMatch?.[1]?.trim() ?? '',
    })
  }
  return reviews
}

function extractTips(raw: string): string {
  const start = raw.indexOf('[작성팁]')
  if (start === -1) return ''
  return raw.slice(start + 5).trim()
}
