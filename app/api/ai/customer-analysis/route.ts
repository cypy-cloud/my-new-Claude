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
    ageGroup,
    gender,
    occupation,
    income,
    familyStatus,
    hasChildren,
    existingInsurance,
    mainConcern,
    personality,
    mbtiType,
    extraNotes,
  } = body

  if (!ageGroup || !occupation || !mainConcern) {
    return NextResponse.json({ error: '나이대, 직업, 주요 관심사는 필수입니다' }, { status: 400 })
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

  const prompt = `당신은 20년 경력의 보험 영업 전문가이자 심리 분석 전문가입니다.
아래 고객 정보를 분석하여 맞춤형 영업 전략을 제시해주세요.

중요: 마크다운 문법(#, ##, **, *, -, 등)을 절대 사용하지 마세요. 순수 텍스트로만 작성하세요.

고객 정보:
- 나이대: ${ageGroup}
- 성별: ${gender || '정보 없음'}
- 직업: ${occupation}
- 소득 수준: ${income || '정보 없음'}
- 가족 상황: ${familyStatus || '정보 없음'}
- 자녀 유무: ${hasChildren || '정보 없음'}
- 기존 보험: ${existingInsurance || '없음'}
- 주요 관심사/걱정: ${mainConcern}
- 성격 유형: ${personality || '정보 없음'}
- MBTI: ${mbtiType || '미검사'}
- 추가 메모: ${extraNotes || '없음'}

${mbtiType ? `
MBTI ${mbtiType} 특성을 반드시 분석에 반영해주세요:
- ${mbtiType[0] === 'I' ? '내향형: 조용하고 신중, 압박보다 충분한 시간과 자료 제공이 효과적' : '외향형: 활동적이고 사교적, 대화와 관계 중심 접근이 효과적'}
- ${mbtiType[1] === 'N' ? '직관형: 큰 그림과 미래 가능성에 집중, 스토리텔링과 비전 제시에 반응' : '감각형: 구체적 사실과 수치 중심, 실용적 혜택을 명확히 제시해야 효과적'}
- ${mbtiType[2] === 'F' ? '감정형: 관계와 가치 중심, 공감과 진정성이 핵심, 논리보다 감성 접근' : '사고형: 논리와 분석 중심, 데이터와 근거를 바탕으로 설득해야 효과적'}
- ${mbtiType[3] === 'P' ? '인식형: 유연하고 개방적, 강요 금물, 선택지를 주고 스스로 결정하게 유도' : '판단형: 계획적이고 결단력 있음, 명확한 플랜과 다음 단계 제시가 효과적'}
` : ''}

아래 형식으로 정확하게 작성해주세요. MBTI와 추가 메모가 있을수록 더 구체적이고 상세하게 분석해주세요:

[성향분석]
(이 고객의 심리적 특성, 의사결정 방식, 보험에 대한 태도를 4~5문장으로 상세히 분석)

[니즈예측]
니즈1: (예상되는 주요 니즈)
니즈2: (예상되는 두 번째 니즈)
니즈3: (예상되는 세 번째 니즈)

[추천상품]
1순위: (상품명) — (추천 이유 1문장)
2순위: (상품명) — (추천 이유 1문장)
3순위: (상품명) — (추천 이유 1문장)

[첫마디]
(이 고객에게 가장 효과적인 첫 번째 접근 멘트. 자연스러운 대화체로 2~3문장)

[주의사항]
1. (첫 번째 주의사항)
2. (두 번째 주의사항)
3. (세 번째 주의사항)

[핵심키워드]
(이 고객의 마음을 움직일 핵심 키워드 5개를 쉼표로 구분)`

  try {
    const result = await generateWithAI(prompt, {
      feature: 'ai_script',
      userId: user.id,
      maxTokens: 1600,
      temperature: 0.7,
      cacheInput: { ageGroup, gender, occupation, income, familyStatus, hasChildren, existingInsurance, mainConcern, personality, mbtiType, extraNotes },
    })

    const wasCached = !!result.cachedAt
    if (!wasCached) {
      await incrementUsage(user.id, 'script', {
        tokenInput: result.usage.inputTokens,
        tokenOutput: result.usage.outputTokens,
      })
    }

    const afterCheck = await checkUsageLimit(user.id, 'script')
    const parsed = parseAnalysis(result.text)

    return NextResponse.json({
      ...parsed,
      rawText: result.text,
      cached: wasCached,
      remaining: afterCheck.remaining,
    })
  } catch (err) {
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'customer_analysis' } })
  }
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[-•]\s*/gm, '')
    .trim()
}

function parseAnalysis(raw: string) {
  const extract = (tag: string, nextTag?: string) => {
    const start = raw.indexOf(`[${tag}]`)
    if (start === -1) return ''
    const contentStart = start + tag.length + 2
    const end = nextTag ? raw.indexOf(`[${nextTag}]`) : raw.length
    return cleanMarkdown(raw.slice(contentStart, end !== -1 ? end : raw.length).trim())
  }

  const tags = ['성향분석', '니즈예측', '추천상품', '첫마디', '주의사항', '핵심키워드']

  const needs = extract('니즈예측', '추천상품')
    .split('\n')
    .filter(l => l.trim().startsWith('니즈'))
    .map(l => l.replace(/^니즈\d+:\s*/, '').trim())

  const products = extract('추천상품', '첫마디')
    .split('\n')
    .filter(l => /^\d순위/.test(l.trim()))
    .map(l => {
      const match = l.match(/^\d순위:\s*(.+?)\s*[—-]\s*(.+)/)
      return match ? { name: match[1].trim(), reason: match[2].trim() } : null
    })
    .filter(Boolean) as Array<{ name: string; reason: string }>

  const keywords = extract('핵심키워드')
    .split(/[,，、]/)
    .map(k => k.trim())
    .filter(Boolean)

  return {
    personality: extract('성향분석', '니즈예측'),
    needs,
    products,
    firstLine: extract('첫마디', '주의사항'),
    cautions: extract('주의사항', '핵심키워드'),
    keywords,
  }
}
