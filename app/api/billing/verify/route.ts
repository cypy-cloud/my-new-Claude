import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBillingAdapter } from '@/lib/billing/billing-provider'
import { activateSubscription, recordPayment } from '@/lib/billing/subscription-service'
import type { PlanId } from '@/lib/subscription/plans'

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

  const adapter = await getBillingAdapter()
  const result = await adapter.verifyPayment({ sessionId, paymentKey, orderId, amount })

  if (!result.success) {
    // 실패 결제 기록
    await recordPayment({
      userId: user.id,
      amount: amount ?? 0,
      provider: result.provider,
      providerTxId: sessionId,
      status: 'failed',
      metadata: { error: result.error },
    }).catch(() => null) // 기록 실패해도 응답은 반환

    return NextResponse.json({ error: result.error ?? '결제 확인에 실패했습니다' }, { status: 400 })
  }

  // 구독 활성화
  const subscription = await activateSubscription({
    userId: user.id,
    planType: planId,
    provider: result.provider,
    providerCustomerId: result.customerId,
    providerSubscriptionId: result.subscriptionId ?? result.transactionId,
  })

  // 성공 결제 기록
  await recordPayment({
    userId: user.id,
    subscriptionId: subscription.id,
    amount: amount ?? 0,
    provider: result.provider,
    providerTxId: result.transactionId,
    status: 'succeeded',
    paidAt: new Date(),
  }).catch(() => null)

  return NextResponse.json({ ok: true, planId, provider: result.provider, subscriptionId: subscription.id })
}
