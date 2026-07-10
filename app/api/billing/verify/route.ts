import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBillingAdapter } from '@/lib/billing/billing-provider'
import { activateSubscription, changePlan, recordPayment } from '@/lib/billing/subscription-service'
import { PLANS, type PlanId } from '@/lib/subscription/plans'

const PLAN_RANK: Record<PlanId, number> = { free: 0, basic: 1, pro: 2, premium: 3 }
const PAYABLE_PLANS: PlanId[] = ['basic', 'pro', 'premium']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { sessionId, planId, paymentKey, orderId, amount } = body as {
    sessionId: string
    planId: PlanId
    paymentKey?: string
    orderId?: string
    amount?: number
  }

  if (!sessionId || !planId) {
    return NextResponse.json({ error: 'sessionId, planId 필수' }, { status: 400 })
  }

  // amount는 클라이언트가 함께 보내는 값이라, 실제 결제 검증(adapter.verifyPayment)이
  // "결제된 금액 == 요청 금액"만 확인하는 것과 별개로, "요청 금액 == 해당 플랜의 정가"인지도
  // 반드시 서버에서 재검증해야 한다. 그렇지 않으면 싼 플랜을 결제해놓고 planId만
  // 비싼 플랜으로 바꿔 보내는 방식으로 무단 업그레이드가 가능해진다.
  const expectedAmount = PLANS[planId]?.price
  if (!PAYABLE_PLANS.includes(planId) || amount === undefined || amount !== expectedAmount) {
    return NextResponse.json({ error: '결제 금액이 요청한 플랜과 일치하지 않습니다' }, { status: 400 })
  }

  // 현재 플랜 조회
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('plan_type')
    .eq('id', user.id)
    .single()
  const currentPlan = (profile?.plan_type as PlanId) ?? 'free'
  const isDowngrade = PLAN_RANK[planId] < PLAN_RANK[currentPlan]

  const adapter = await getBillingAdapter()
  const result = await adapter.verifyPayment({ sessionId, paymentKey, orderId, amount })

  if (!result.success) {
    await recordPayment({
      userId: user.id,
      amount: amount ?? 0,
      provider: result.provider,
      providerTxId: sessionId,
      status: 'failed',
      metadata: { error: result.error },
    }).catch(() => null)

    return NextResponse.json({ error: result.error ?? '결제 확인에 실패했습니다' }, { status: 400 })
  }

  let subscriptionId: string
  let effectiveDate: string | null = null

  if (isDowngrade) {
    // 다운그레이드: 말일까지 현재 플랜 유지, 다음달 1일에 적용
    const changeResult = await changePlan({
      userId: user.id,
      fromPlan: currentPlan,
      toPlan: planId,
      provider: result.provider,
      transactionId: result.transactionId,
      amount: amount ?? 0,
    })
    effectiveDate = changeResult.effectiveDate

    // subscriptionId는 기존 구독 유지
    const { data: sub } = await (supabase as any)
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    subscriptionId = sub?.id ?? ''
  } else {
    // 업그레이드 또는 동급: 즉시 적용, 구독 기간은 항상 1개월.
    const now = new Date()
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

    const subscription = await activateSubscription({
      userId: user.id,
      planType: planId,
      provider: result.provider,
      providerCustomerId: result.customerId,
      providerSubscriptionId: result.subscriptionId ?? result.transactionId,
      billingInterval: 'month',
      periodEnd,
    })
    subscriptionId = subscription.id
  }

  await recordPayment({
    userId: user.id,
    subscriptionId: subscriptionId || undefined,
    amount: amount ?? 0,
    provider: result.provider,
    providerTxId: result.transactionId,
    status: 'succeeded',
    paidAt: new Date(),
  }).catch(() => null)

  return NextResponse.json({
    ok: true,
    planId,
    provider: result.provider,
    subscriptionId,
    immediate: !isDowngrade,
    effectiveDate,
    message: isDowngrade && effectiveDate
      ? `${effectiveDate}부터 ${planId} 플랜으로 변경됩니다. 그 전까지는 현재 플랜을 계속 사용하실 수 있습니다.`
      : null,
  })
}
