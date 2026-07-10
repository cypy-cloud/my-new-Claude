import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLANS, type PlanId } from '@/lib/subscription/plans'
import { getBillingAdapter } from '@/lib/billing/provider'
import { trackEvent } from '@/lib/analytics/track'

const VALID_PLANS: PlanId[] = ['basic', 'pro', 'premium']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { planId } = body as { planId: PlanId }
  // 연간결제는 KPN 정책상 지원하지 않음 — 항상 월간으로 고정
  const interval: 'month' = 'month'

  if (!VALID_PLANS.includes(planId)) {
    return NextResponse.json({ error: '유효하지 않은 요금제입니다' }, { status: 400 })
  }

  // 현재 플랜 확인
  const { data: profile } = await (supabase as any)
    .from('profiles').select('plan_type').eq('id', user.id).single()
  const currentPlan = (profile?.plan_type as PlanId) ?? 'free'

  if (currentPlan === planId) {
    return NextResponse.json({ error: '이미 해당 요금제를 사용 중입니다' }, { status: 400 })
  }

  const plan = PLANS[planId]
  const amount = plan.price
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/billing/checkout/complete`

  const adapter = await getBillingAdapter()
  const session = await adapter.createCheckoutSession({
    userId: user.id,
    planId,
    amount,
    interval,
    returnUrl,
  })

  await trackEvent('upgrade_click', {
    userId: user.id,
    metadata: { fromPlan: currentPlan, toPlan: planId, interval, provider: session.provider, amount },
  })

  await (supabase as any).from('subscription_events').insert({
    user_id: user.id,
    event_type: 'checkout_initiated',
    from_plan: currentPlan,
    to_plan: planId,
    amount,
    provider: session.provider,
    provider_tx_id: session.sessionId,
    status: 'pending',
  })

  return NextResponse.json({ checkoutUrl: session.checkoutUrl, sessionId: session.sessionId, provider: session.provider })
}
