import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { changePlan } from '@/lib/billing/subscription-service'
import { PLAN_LABELS, type PlanId } from '@/lib/subscription/plans'

const PLAN_RANK: Record<PlanId, number> = { free: 0, basic: 1, pro: 2, premium: 3 }
const VALID_PLANS: PlanId[] = ['free', 'basic', 'pro', 'premium']

// 다운그레이드는 결제가 필요 없는 예약 변경(다음달 1일 적용)이라 결제 절차 없이
// changePlan()을 바로 호출한다. 예전엔 업그레이드와 같은 /api/billing/checkout을
// 거쳐 실제 결제 세션을 생성했는데, KPN MID가 단건결제를 지원하지 않아
// 이 경로로는 다운그레이드 자체가 항상 실패하고 있었음 (2026-07-21 코드 재검토로 발견).
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { planId } = body as { planId: PlanId }

  if (!VALID_PLANS.includes(planId)) {
    return NextResponse.json({ error: '유효하지 않은 요금제입니다' }, { status: 400 })
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('plan_type')
    .eq('id', user.id)
    .single()
  const currentPlan = (profile?.plan_type as PlanId) ?? 'free'

  if (currentPlan === planId) {
    return NextResponse.json({ error: '이미 해당 요금제를 사용 중입니다' }, { status: 400 })
  }
  if (PLAN_RANK[planId] >= PLAN_RANK[currentPlan]) {
    return NextResponse.json({ error: '업그레이드는 이 경로를 사용할 수 없습니다' }, { status: 400 })
  }

  const result = await changePlan({
    userId: user.id,
    fromPlan: currentPlan,
    toPlan: planId,
    provider: 'portone',
  })

  return NextResponse.json({
    ok: true,
    planId,
    immediate: result.immediate,
    effectiveDate: result.effectiveDate,
    message: result.effectiveDate
      ? `${result.effectiveDate}부터 ${PLAN_LABELS[planId]} 플랜으로 변경됩니다. 그 전까지는 현재 플랜을 계속 사용하실 수 있습니다.`
      : `${PLAN_LABELS[planId]} 플랜으로 변경되었습니다.`,
  })
}
