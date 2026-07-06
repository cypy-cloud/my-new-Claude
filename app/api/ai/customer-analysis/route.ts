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

  // MBTI 심층 분석 데이터
  const mbtiProfile = mbtiType ? (() => {
    const E_I = mbtiType[0] === 'E'
      ? '외향형(E): 대화하면서 생각을 정리하는 스타일. 설계사와 활발하게 소통하며 즉각적인 반응을 보임. 관계와 신뢰가 쌓이면 빠른 결정이 가능함.'
      : '내향형(I): 혼자 충분히 생각한 후 결정하는 스타일. 상담 중 압박하면 역효과. 자료를 주고 스스로 검토할 시간을 충분히 줘야 함.'
    const N_S = mbtiType[1] === 'N'
      ? '직관형(N): 미래 가능성과 큰 그림에 집중. "10년 후 어떻게 될까"에 반응. 스토리텔링, 비전 제시, 감성적 시나리오로 접근해야 효과적.'
      : '감각형(S): 구체적인 사실과 현재 상황 중심. 숫자, 비교표, 실제 사례가 효과적. 추상적 미래보다 "지금 당장 얼마" 같은 명확한 정보를 선호.'
    const F_T = mbtiType[2] === 'F'
      ? '감정형(F): 가족과 소중한 사람을 위한 가치 중심으로 결정. 공감과 진정성이 핵심. "가족을 위해서"라는 감성 접근이 논리적 설명보다 훨씬 효과적. 설계사를 신뢰하면 감정적으로 빠르게 움직임.'
      : '사고형(T): 감정보다 논리와 분석으로 결정. 감성적 호소는 오히려 신뢰를 잃게 함. 비용 대비 효과, 데이터, 객관적 비교가 설득의 핵심. 질문이 많고 꼼꼼하게 따지는 편.'
    const J_P = mbtiType[3] === 'J'
      ? '판단형(J): 계획적이고 결단력 있음. 명확한 로드맵과 다음 단계 제시를 좋아함. "오늘 결정하면 이런 혜택"처럼 구체적 액션플랜 제시가 효과적. 불확실한 상태를 불편해함.'
      : '인식형(P): 유연하고 개방적이나 결정을 미루는 경향. 강요는 절대 금물. 여러 선택지를 제시하고 스스로 결정하게 유도해야 함. 흥미로운 측면을 부각해 자연스럽게 관심을 끌어야 함.'
    return { E_I, N_S, F_T, J_P }
  })() : null

  const prompt = `당신은 20년 경력의 보험 영업 전문가이자 심리·행동 분석 전문가입니다.
아래 고객 정보를 바탕으로 실제 현장에서 바로 활용할 수 있는 깊이 있는 맞춤형 분석을 제공해주세요.

중요: 마크다운 문법(#, ##, **, *, -, 등)을 절대 사용하지 마세요. 순수 텍스트로만 작성하세요.
상품 추천 시 반드시 최신 기준을 사용하세요: 실손의료보험은 현재 5세대(2024년 출시)가 최신입니다. "4세대 실손"이라는 표현은 절대 사용하지 마세요.

고객 기본 정보:
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

${mbtiProfile ? `
=== MBTI ${mbtiType} 심층 분석 (반드시 성향분석과 상담전략에 깊게 반영) ===

${mbtiProfile.E_I}

${mbtiProfile.N_S}

${mbtiProfile.F_T}

${mbtiProfile.J_P}

이 MBTI 유형이 보험을 대하는 태도:
- 정보 수집 방식: ${mbtiType[1] === 'N' ? '직관적으로 전체 그림을 먼저 파악하려 함. 세부 조항보다 "이게 나한테 왜 필요한가"에 집중.' : '하나하나 꼼꼼히 확인하는 편. 약관, 보장 내용, 비교표를 직접 확인해야 안심함.'}
- 의사결정 속도: ${mbtiType[3] === 'J' ? '결정 조건이 충족되면 빠르게 계약. 단, 불확실한 부분이 있으면 오히려 전체를 보류함.' : '충동적 결정을 피하고 여러 번 생각함. 마감 압박보다는 자연스러운 흐름이 효과적.'}
- 거절 패턴: ${mbtiType[2] === 'F' ? '감정적 불편함을 느끼면 "생각해볼게요"로 피함. 관계가 회복되면 다시 열림.' : '논리적 허점이 보이면 강하게 거절. 데이터로 반박하거나 다른 각도의 논리를 준비해야 함.'}
- 계약 후 관리: ${mbtiType[0] === 'I' ? '연락이 너무 잦으면 부담감을 느낌. 의미 있는 정보를 적절한 간격으로 전달하는 것이 신뢰 유지에 효과적.' : '주기적인 연락과 관심 표현을 좋아함. 관계를 지속적으로 유지하면 추가 계약이나 소개로 이어질 가능성 높음.'}
` : ''}

아래 형식으로 정확하게 작성해주세요. MBTI가 있을 경우 성향분석은 반드시 MBTI 특성을 중심으로 보험 결정 패턴과 상담 전략을 풍부하고 구체적으로 7~9문장 이상 작성하세요:

[성향분석]
(이 고객의 심리적 특성, 보험을 대하는 태도, 의사결정 방식, MBTI 기반 행동 패턴, 설계사가 취해야 할 전체적인 상담 접근법을 상세하고 풍부하게 분석. MBTI가 있으면 각 지표별 특성이 이 고객의 보험 구매 행동에 어떻게 나타나는지 구체적으로 설명)

[니즈예측]
니즈1: (예상되는 주요 니즈와 그 심리적 배경)
니즈2: (예상되는 두 번째 니즈와 그 심리적 배경)
니즈3: (예상되는 세 번째 니즈와 그 심리적 배경)

[추천상품]
1순위: (상품명) — (추천 이유: MBTI 성향과 연결해서 왜 이 고객에게 맞는지 구체적으로)
2순위: (상품명) — (추천 이유: MBTI 성향과 연결해서 왜 이 고객에게 맞는지 구체적으로)
3순위: (상품명) — (추천 이유: MBTI 성향과 연결해서 왜 이 고객에게 맞는지 구체적으로)

[첫마디]
(이 고객의 MBTI와 성향에 최적화된 첫 접근 멘트. 자연스럽고 임팩트 있게 3~4문장)

[주의사항]
1. (이 MBTI 유형에서 설계사가 절대 하면 안 되는 실수)
2. (거절했을 때 대처법)
3. (신뢰를 쌓기 위한 핵심 행동)

[핵심키워드]
(이 고객의 마음을 움직일 핵심 키워드 5개를 쉼표로 구분)`

  try {
    const result = await generateWithAI(prompt, {
      feature: 'ai_script',
      userId: user.id,
      model: 'claude-sonnet-4-6',
      maxTokens: 3800,
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
