import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI } from '@/lib/ai/provider'
import { reserveUsage, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { handleApiError } from '@/lib/errors/api-error-handler'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const {
    customerName,
    ageGroup,
    gender,
    occupation,
    familyStatus,
    childrenStatus,
    interestProducts,
    memo,
    contractDate,
    birthMonth,
  } = body

  if (!customerName || !ageGroup) {
    return NextResponse.json({ error: '고객 이름과 나이대는 필수입니다' }, { status: 400 })
  }

  let payerId = user.id
  let borrowedTeamId: string | undefined
  try {
    const reservation = await reserveUsage(user.id, 'sms')
    payerId = reservation.payerId
    borrowedTeamId = reservation.teamId
  } catch (err) {
    if (err instanceof UsageLimitError) {
      return NextResponse.json(
        { error: err.message, limitExceeded: true, check: err.check },
        { status: 429 }
      )
    }
    throw err
  }

  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  const prompt = `당신은 20년 경력의 보험설계사 전문 코치입니다.
고객의 생애주기를 분석하여 향후 12개월 내 가장 효과적인 연락 타이밍과 방법을 추천해주세요.

## 고객 정보
- 이름: ${customerName}
- 나이대: ${ageGroup}
- 성별: ${gender || '미기재'}
- 직업: ${occupation || '미기재'}
- 가족 상황: ${familyStatus || '미기재'}
- 자녀 현황: ${childrenStatus || '없음'}
- 관심 상품: ${Array.isArray(interestProducts) ? interestProducts.join(', ') : (interestProducts || '미기재')}
- 보험 가입 시기: ${contractDate || '미기재'}
- 생일 월: ${birthMonth ? `${birthMonth}월` : '미기재'}
- 메모: ${memo || '없음'}
- 현재 날짜: ${currentYear}년 ${currentMonth}월

## 요청사항
이 고객에게 향후 12개월 내 연락해야 할 중요한 타이밍 5~6개를 찾아주세요.
단순한 생일 인사 외에도 보험 갱신, 자녀 성장, 명절, 세금 시즌, 건강검진 시즌 등 다양한 각도로 분석해주세요.

아래 형식으로 정확하게 작성해주세요:

[타이밍1]
시기: (YYYY년 MM월 또는 "X개월 후")
제목: (연락 이유를 5단어 이내로)
이유: (왜 이 시기에 연락해야 하는지 1~2문장)
멘트: "(실제 보낼 수 있는 문자/카톡 메시지 2~3문장)"
추천상품: (이 시기에 제안할 상품명, 없으면 "관계 유지")

[타이밍2]
시기:
제목:
이유:
멘트:
추천상품:

[타이밍3]
시기:
제목:
이유:
멘트:
추천상품:

[타이밍4]
시기:
제목:
이유:
멘트:
추천상품:

[타이밍5]
시기:
제목:
이유:
멘트:
추천상품:

[총평]
(이 고객과의 관계 강화를 위한 전체적인 전략 2~3문장)`

  try {
    const result = await generateWithAI(prompt, {
      feature: 'ai_script',
      userId: user.id,
      maxTokens: 3000,
      temperature: 0.7,
      cacheInput: { customerName, ageGroup, gender, occupation, familyStatus, childrenStatus, interestProducts, contractDate, birthMonth, currentMonth, currentYear },
    })

    const wasCached = !!result.cachedAt
    if (!wasCached) {
      await incrementUsage(payerId, 'sms', {
        tokenInput: result.usage.inputTokens,
        tokenOutput: result.usage.outputTokens,
        teamId: borrowedTeamId,
      })
    }

    const afterCheck = await checkUsageLimit(user.id, 'sms')
    const timings = parseTimings(result.text)
    const summary = extractSection(result.text, '총평')

    return NextResponse.json({
      timings,
      summary,
      customerName,
      cached: wasCached,
      remaining: afterCheck.remaining,
    })
  } catch (err) {
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'lifecycle_alert' } })
  }
}

function extractSection(raw: string, tag: string, nextTag?: string): string {
  const start = raw.indexOf(`[${tag}]`)
  if (start === -1) return ''
  const contentStart = start + tag.length + 2
  const end = nextTag ? raw.indexOf(`[${nextTag}]`) : raw.length
  return raw.slice(contentStart, end !== -1 ? end : raw.length).trim()
}

function parseTimings(raw: string) {
  const timings = []
  for (let i = 1; i <= 6; i++) {
    const tag = `타이밍${i}`
    const nextTag = i < 6 ? `타이밍${i + 1}` : '총평'
    const start = raw.indexOf(`[${tag}]`)
    if (start === -1) break

    const contentStart = start + tag.length + 2
    const end = raw.indexOf(`[${nextTag}]`, contentStart)
    const block = raw.slice(contentStart, end !== -1 ? end : raw.length)

    const get = (key: string) => {
      const match = block.match(new RegExp(`${key}:\\s*(.+)`))
      return match?.[1]?.trim() ?? ''
    }
    const scriptMatch = block.match(/멘트:\s*"([^"]+)"/)

    timings.push({
      index: i,
      timing: get('시기'),
      title: get('제목'),
      reason: get('이유'),
      message: scriptMatch?.[1]?.trim() ?? get('멘트'),
      product: get('추천상품'),
    })
  }
  return timings
}
