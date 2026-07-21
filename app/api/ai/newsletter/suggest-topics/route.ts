import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI } from '@/lib/ai/provider'
import { handleApiError } from '@/lib/errors/api-error-handler'
import { getCurrentSeasonContext } from '@/lib/content/newsletter-season'

// Vercel 기본 타임아웃(Pro 기준 무설정 시 15초) 방어 (2026-07-21 AI 기능 재검토로 발견)
export const maxDuration = 240

function buildSuggestPrompt(params: {
  categoryLabel: string
  subcategoryLabel: string
  targetAudience: string
  insuranceField: string
}): string {
  const { categoryLabel, subcategoryLabel, targetAudience, insuranceField } = params

  return `당신은 보험설계사(FP)를 위한 뉴스레터 주제 기획 전문가입니다.

아래 조건에 맞는 뉴스레터 주제(제목) 후보를 4개 만들어주세요.

[조건]
- 대분류: ${categoryLabel}
- 중분류: ${subcategoryLabel}
- 대상 고객층: ${targetAudience || '일반 고객'}
- 보험 분야: ${insuranceField || '전체'}
- 현재 시기: ${getCurrentSeasonContext()}

[작성 원칙]
1. 각 주제는 실제 뉴스레터 제목으로 바로 써도 될 만큼 구체적이고 후킹되게 작성하세요
2. 30자 이내로 간결하게
3. 막연한 표현("보험에 대해") 대신 구체적인 앵글을 담으세요 (예: "장마철 무좀·습진, 실손보험으로 챙기는 법")
4. 4개는 서로 다른 각도로 작성하세요
5. 마크다운 기호나 번호 없이, 한 줄에 하나씩만 출력하세요`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { categoryLabel, subcategoryLabel, targetAudience = '', insuranceField = '' } = body

  if (!categoryLabel || !subcategoryLabel) {
    return NextResponse.json({ error: '대분류와 중분류를 선택해주세요' }, { status: 400 })
  }

  const prompt = buildSuggestPrompt({ categoryLabel, subcategoryLabel, targetAudience, insuranceField })

  try {
    // 사용량 한도와 무관한 보조 기능이라 blockIfLimitExceeded/incrementUsage를 호출하지 않는다 —
    // 실제 뉴스레터 생성(뉴스레터 API)에서만 사용량이 차감된다. cacheInput은 의도적으로 넘기지
    // 않아 "재생성" 클릭마다 매번 새로운 후보가 나오도록 한다(캐시된 동일 응답 방지).
    const result = await generateWithAI(prompt, {
      feature: 'ai_script',
      userId: user.id,
      maxTokens: 400,
      temperature: 0.9,
    })

    const topics = result.text
      .split('\n')
      .map(line => line.replace(/^[\d.\-*\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 4)

    return NextResponse.json({ topics })
  } catch (err) {
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'ai_newsletter_suggest_topics', categoryLabel, subcategoryLabel } })
  }
}
