import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubscription } from '@/lib/billing/subscription-service'
import { requestCancellation } from '@/lib/billing/payment-webhook'

// POST /api/billing/cancel
// body: { immediately?: boolean }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const immediately = Boolean(body.immediately)

  const subscription = await getSubscription(user.id)
  if (!subscription) {
    return NextResponse.json({ error: '활성 구독이 없습니다' }, { status: 404 })
  }
  if (subscription.status === 'canceled' || subscription.status === 'expired') {
    return NextResponse.json({ error: '이미 해지된 구독입니다' }, { status: 400 })
  }
  if (subscription.cancelAtPeriodEnd && !immediately) {
    return NextResponse.json({ error: '이미 해지 예약된 구독입니다' }, { status: 400 })
  }

  const result = await requestCancellation({
    userId: user.id,
    providerSubscriptionId: subscription.providerSubscriptionId ?? undefined,
    immediately,
  })

  if (!result.handled) {
    return NextResponse.json({ error: result.error ?? '해지 처리 중 오류가 발생했습니다' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    action: result.action,
    message: immediately
      ? '구독이 즉시 해지되었습니다. 요금제가 무료로 변경됩니다.'
      : `구독이 ${subscription.currentPeriodEnd.slice(0, 10)} 이후 해지됩니다.`,
  })
}
