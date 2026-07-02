import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, DuplicateRequestError } from '@/lib/ai/provider'
import { getActivePrompt, renderPrompt } from '@/lib/ai/prompts/prompt-versioning'
import { blockIfLimitExceeded, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { trackFeatureComplete } from '@/lib/analytics/track'
import { handleApiError } from '@/lib/errors/api-error-handler'
import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from '@/types'

const DISCLAIMER = '\n\n[보험 관련 유의사항] 이 추천 결과는 AI가 상담 이력을 바탕으로 생성한 참고 자료입니다. 클로징 가능성 평가는 확정적인 결과를 보장하지 않는 참고 지표일 뿐이며, 실제 상담은 고객 상황에 맞게 진행해주세요.'

const SECTION_MARKERS = ['STATUS_ANALYSIS', 'TIMING', 'PURPOSE', 'KAKAO_MESSAGES', 'CALL_OPENING', 'CAUTIONS', 'CLOSING_LIKELIHOOD']

function parseOutputSections(raw: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (let i = 0; i < SECTION_MARKERS.length; i++) {
    const marker = SECTION_MARKERS[i]
    const nextMarker = SECTION_MARKERS[i + 1]
    const startTag = `[${marker}]`
    const start = raw.indexOf(startTag)
    if (start === -1) continue

    const contentStart = start + startTag.length
    const end = nextMarker ? raw.indexOf(`[${nextMarker}]`, contentStart) : raw.length
    result[marker] = raw.slice(contentStart, end !== -1 ? end : raw.length).trim() + DISCLAIMER
  }

  return result
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { customerId, forceRegenerate = false } = body

  if (!customerId) {
    return NextResponse.json({ error: '고객을 선택해주세요' }, { status: 400 })
  }

  const { data: customer } = await (supabase as any)
    .from('customers')
    .select('id, name, status, interest_products, memo')
    .eq('id', customerId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!customer) {
    return NextResponse.json({ error: '고객 정보를 찾을 수 없습니다' }, { status: 404 })
  }

  const { data: interactions } = await (supabase as any)
    .from('customer_interactions')
    .select('interaction_type, title, content, next_action, next_action_date, sentiment, created_at')
    .eq('customer_id', customerId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const interactionList = interactions ?? []
  const lastContactDate = interactionList[0]?.created_at
    ? new Date(interactionList[0].created_at).toLocaleDateString('ko-KR')
    : '기록 없음'

  const interactionHistory = interactionList.length > 0
    ? interactionList.map((it: any) =>
        `- [${new Date(it.created_at).toLocaleDateString('ko-KR')}] ${it.title} (${it.interaction_type}, 분위기: ${it.sentiment})${it.content ? ` — ${it.content}` : ''}${it.next_action ? ` / 다음 액션: ${it.next_action}` : ''}`
      ).join('\n')
    : '상담 이력 없음'

  const expectedObjections = body.expectedObjections || interactionList.find((it: any) => it.next_action)?.next_action || '없음'

  try {
    await blockIfLimitExceeded(user.id, 'followup')
  } catch (err) {
    if (err instanceof UsageLimitError) {
      return NextResponse.json(
        { error: err.message, limitExceeded: true, check: err.check },
        { status: 429 }
      )
    }
    throw err
  }

  const { template, version } = await getActivePrompt('ai_followup')
  const prompt = renderPrompt(template, {
    customer_name: customer.name || '고객',
    customer_status: CUSTOMER_STATUS_LABELS[customer.status as CustomerStatus] ?? customer.status,
    product_interest: Array.isArray(customer.interest_products) && customer.interest_products.length > 0
      ? customer.interest_products.join(', ')
      : '정보 없음',
    last_contact_date: lastContactDate,
    expected_objections: expectedObjections,
    interaction_history: interactionHistory,
  })

  const cacheInput = {
    customerId, customerName: customer.name, status: customer.status,
    interestProducts: customer.interest_products, lastContactDate, interactionCount: interactionList.length,
    expectedObjections,
  }

  let result
  let sections: Record<string, string>
  try {
    result = await generateWithAI(prompt, {
      feature: 'ai_followup',
      userId: user.id,
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 3000,
      temperature: 0.7,
      cacheInput,
      promptVersion: version,
      forceRegenerate,
    })
    sections = parseOutputSections(result.text)

    if (Object.keys(sections).length === 0 && result.cachedAt) {
      result = await generateWithAI(prompt, {
        feature: 'ai_followup',
        userId: user.id,
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 3000,
        temperature: 0.7,
        cacheInput,
        promptVersion: version,
        forceRegenerate: true,
      })
      sections = parseOutputSections(result.text)
    }
  } catch (err) {
    if (err instanceof DuplicateRequestError) {
      return NextResponse.json({ error: err.message, duplicate: true }, { status: 409 })
    }
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'ai_followup' } })
  }

  const wasCached = !!result.cachedAt

  if (!wasCached) {
    await incrementUsage(user.id, 'followup', {
      tokenInput: result.usage.inputTokens,
      tokenOutput: result.usage.outputTokens,
    })
    await trackFeatureComplete('ai_followup', user.id, {
      customerId,
      cached: false,
    })
  }

  const afterCheck = await checkUsageLimit(user.id, 'followup')

  return NextResponse.json({
    sections,
    rawText: result.text,
    cached: wasCached,
    remaining: afterCheck.remaining,
    provider: result.provider,
    model: result.model,
    promptVersion: version,
  })
}
