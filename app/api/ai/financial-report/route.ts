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
    ageGroup,
    gender,
    occupation,
    familyStatus,
    monthlyIncome,
    monthlyExpense,
    currentInsurancePremium,
    savings,
    debt,
    financialGoal,
    existingInsurance,
    healthStatus,
  } = body

  if (!ageGroup || !monthlyIncome || !financialGoal) {
    return NextResponse.json({ error: '나이대, 월 소득, 재무 목표는 필수입니다' }, { status: 400 })
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

  const netIncome = parseInt(monthlyIncome || '0') - parseInt(monthlyExpense || '0')
  const affordablePremium = Math.round(netIncome * 0.07)

  const prompt = `당신은 CFP(공인재무설계사) 자격을 보유한 보험 전문 재무설계사입니다.
아래 고객의 재무 정보를 바탕으로 전문적인 보장 분석 리포트를 작성해주세요.

## 고객 재무 정보
- 고객명: ${customerName || '고객'}
- 나이대: ${ageGroup}
- 성별: ${gender || '미기재'}
- 직업: ${occupation || '미기재'}
- 가족 상황: ${familyStatus || '미기재'}
- 월 소득: ${monthlyIncome}만원
- 월 지출: ${monthlyExpense || '미기재'}만원
- 현재 보험료 납입액: ${currentInsurancePremium || '0'}만원/월
- 저축/투자: ${savings || '미기재'}만원/월
- 부채: ${debt || '없음'}
- 재무 목표: ${financialGoal}
- 기존 보험: ${existingInsurance || '없음'}
- 건강 상태: ${healthStatus || '양호'}
- 적정 보험료 여력 (소득의 7%): 약 ${affordablePremium}만원/월

아래 형식으로 정확하게 작성해주세요:

[종합평가]
(현재 재무 상태에 대한 전문가 종합 의견 3~4문장. 긍정적 부분과 개선이 필요한 부분 균형있게)

[보장분석]
사망보장: (현재 상태와 권장 수준 비교, 1~2문장)
의료보장: (현재 상태와 권장 수준 비교, 1~2문장)
노후보장: (현재 상태와 권장 수준 비교, 1~2문장)
재해보장: (현재 상태와 권장 수준 비교, 1~2문장)

[우선순위]
1순위: (가장 시급한 보완 영역) — (이유 1문장)
2순위: (두 번째 보완 영역) — (이유 1문장)
3순위: (세 번째 보완 영역) — (이유 1문장)

[추천플랜]
(월 납입 여력 ${affordablePremium}만원 기준으로 구체적인 포트폴리오 제안. 상품 유형과 예상 보험료 배분을 포함하여 3~4문장)

[실행계획]
단기(3개월): (즉시 실행할 행동 1가지)
중기(1년): (1년 내 달성할 목표 1가지)
장기(5년+): (장기적으로 준비할 사항 1가지)

[설계사메모]
(이 고객을 상담할 때 설계사가 강조해야 할 포인트와 주의사항. 2~3문장)`

  try {
    const result = await generateWithAI(prompt, {
      feature: 'ai_script',
      userId: user.id,
      maxTokens: 1400,
      temperature: 0.65,
      cacheInput: { customerName, ageGroup, gender, occupation, familyStatus, monthlyIncome, monthlyExpense, currentInsurancePremium, savings, debt, financialGoal, existingInsurance, healthStatus },
    })

    const wasCached = !!result.cachedAt
    if (!wasCached) {
      await incrementUsage(user.id, 'script', {
        tokenInput: result.usage.inputTokens,
        tokenOutput: result.usage.outputTokens,
      })
    }

    const afterCheck = await checkUsageLimit(user.id, 'script')
    const parsed = parseReport(result.text)

    return NextResponse.json({
      ...parsed,
      customerName: customerName || '고객',
      ageGroup,
      monthlyIncome,
      affordablePremium,
      currentInsurancePremium: currentInsurancePremium || '0',
      financialGoal,
      rawText: result.text,
      cached: wasCached,
      remaining: afterCheck.remaining,
    })
  } catch (err) {
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'financial_report' } })
  }
}

function parseReport(raw: string) {
  const extract = (tag: string, nextTag?: string) => {
    const start = raw.indexOf(`[${tag}]`)
    if (start === -1) return ''
    const contentStart = start + tag.length + 2
    const end = nextTag ? raw.indexOf(`[${nextTag}]`) : raw.length
    return raw.slice(contentStart, end !== -1 ? end : raw.length).trim()
  }

  const coverageRaw = extract('보장분석', '우선순위')
  const coverage: Record<string, string> = {}
  coverageRaw.split('\n').forEach(line => {
    const match = line.match(/^(.+?):\s*(.+)/)
    if (match) coverage[match[1].trim()] = match[2].trim()
  })

  const prioritiesRaw = extract('우선순위', '추천플랜')
  const priorities = prioritiesRaw.split('\n')
    .filter(l => /^\d순위/.test(l.trim()))
    .map(l => {
      const match = l.match(/^\d순위:\s*(.+?)\s*[—-]\s*(.+)/)
      return match ? { area: match[1].trim(), reason: match[2].trim() } : null
    })
    .filter(Boolean) as Array<{ area: string; reason: string }>

  const planRaw = extract('실행계획', '설계사메모')
  const plan: Record<string, string> = {}
  planRaw.split('\n').forEach(line => {
    const match = line.match(/^(단기|중기|장기)[^:]*:\s*(.+)/)
    if (match) plan[match[1]] = match[2].trim()
  })

  return {
    summary: extract('종합평가', '보장분석'),
    coverage,
    priorities,
    recommendedPlan: extract('추천플랜', '실행계획'),
    actionPlan: plan,
    agentMemo: extract('설계사메모'),
  }
}
