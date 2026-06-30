import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBillingAdapter } from '@/lib/billing/provider'
import { updateSubscription } from '@/lib/billing/update-subscription'
import type { PlanId } from '@/lib/subscription/plans'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { sessionId, planId, paymentKey, orderId, amount } = body as {
    sessionId: string; planId: PlanId; paymentKey?: string; orderId?: string; amount?: number
  }

  if (!sessionId || !planId) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다' }, { status: 400 })
  }

  // 현재 플랜 확인
  const { data: profile } = await (supabase as any)
    .from('profiles').select('plan_type').eq('id', user.id).single()
  const fromPlan = (profile?.plan_type as PlanId) ?? 'free'

  const adapter = await getBillingAdapter()
  const result = await adapter.verifyPayment({ sessionId, paymentKey, orderId, amount })

  if (!result.success) {
    await (supabase as any).from('subscription_events').insert({
      user_id: user.id,
      event_type: 'payment_fail',
      from_plan: fromPlan,
      to_plan: planId,
      provider: result.provider,
      provider_tx_id: sessionId,
      status: 'failed',
      metadata: { error: result.error },
    })
    return NextResponse.json({ error: result.error ?? '결제 확인에 실패했습니다' }, { status: 400 })
  }

  await updateSubscription({
    userId: user.id,
    fromPlan,
    toPlan: planId,
    provider: result.provider,
    transactionId: result.transactionId,
    amount,
  })

  return NextResponse.json({ ok: true, planId, provider: result.provider })
}
