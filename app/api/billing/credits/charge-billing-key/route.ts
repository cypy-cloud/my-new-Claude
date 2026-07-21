import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addExtraCredits, getExtraCredits } from '@/lib/subscription/usage'
import { PortOneProvider } from '@/lib/billing/portone-provider'
import { recordPayment } from '@/lib/billing/subscription-service'
import { VALID_PACK_MAP } from '@/lib/billing/credit-packs'
import type { PlanId } from '@/lib/subscription/plans'
import { handleApiError } from '@/lib/errors/api-error-handler'

const PAID_PLANS: PlanId[] = ['basic', 'pro', 'premium']

// 등록된 빌링키로 원클릭 크레딧 결제 (결제 페이지 이동 없이 즉시 청구)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  try {
    return await handleChargeCredits(request, user.id, supabase)
  } catch (e) {
    // 실결제 라우트라 예상 못한 예외가 그대로 터지면 클라이언트가 빈 응답을 JSON으로
    // 파싱하려다 알아보기 힘든 에러만 보게 됨 — 반드시 에러가 담긴 JSON으로 반환하되,
    // 내부 에러 메시지가 그대로 노출되지 않도록 handleApiError로 감싼다
    // (2026-07-21 에러처리 재검토로 발견 — 디버깅 중 임시로 e.message를 그대로 노출했었음).
    return handleApiError(e, { userId: user.id, area: 'payment', metadata: { feature: 'credits_charge_billing_key' } })
  }
}

async function handleChargeCredits(request: NextRequest, userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('plan_type, portone_billing_key, portone_customer_id')
    .eq('id', userId)
    .single()

  const planId = (profile?.plan_type as PlanId) ?? 'free'
  if (!PAID_PLANS.includes(planId)) {
    return NextResponse.json({ error: '추가 크레딧 구매는 유료 플랜(Basic 이상)에서만 가능합니다' }, { status: 403 })
  }
  if (!profile?.portone_billing_key || !profile?.portone_customer_id) {
    return NextResponse.json({ error: '등록된 자동결제 카드가 없습니다', noBillingKey: true }, { status: 400 })
  }

  const body = await request.json()
  const { packSize, featureType = 'all' } = body as {
    packSize?: number
    featureType?: 'script' | 'sms' | 'all'
  }

  const amount = packSize ? VALID_PACK_MAP[packSize] : undefined
  if (!packSize || !amount) {
    return NextResponse.json({ error: '유효하지 않은 팩입니다' }, { status: 400 })
  }

  const paymentId = `creditsbk${userId.replace(/-/g, '').slice(0, 10)}${Date.now()}`
  const provider = new PortOneProvider()
  const result = await provider.chargeBillingKey({
    billingKey: profile.portone_billing_key,
    customerId: profile.portone_customer_id,
    amount,
    paymentId,
    orderName: `FP AI Assistant 추가 크레딧 ${packSize}건`,
  })

  if (!result.success) {
    await recordPayment({
      userId,
      amount,
      provider: 'portone',
      providerTxId: paymentId,
      status: 'failed',
      metadata: { error: result.error },
    }).catch(() => null)

    return NextResponse.json({ error: result.error ?? '결제에 실패했습니다' }, { status: 400 })
  }

  // 청구가 실제로 성공한 직후 곧바로 결제 기록부터 남긴다 — 이후 크레딧 지급이 실패해도
  // "돈은 빠졌는데 기록이 없는" 상태가 되지 않도록 함 (구독 결제와 동일한 원칙,
  // 2026-07-21 실결제 테스트 중 발견된 이중 청구 사고 재발 방지)
  await recordPayment({
    userId,
    amount,
    provider: 'portone',
    providerTxId: result.paymentId ?? paymentId,
    status: 'succeeded',
    paidAt: new Date(),
    metadata: { type: 'credits', packSize },
  })

  await addExtraCredits({
    userId,
    featureType,
    packSize,
    amountPaid: amount,
    orderId: paymentId,
    paymentKey: result.paymentId ?? paymentId,
  })

  const updatedCredits = await getExtraCredits(userId, featureType)
  return NextResponse.json({
    success: true,
    creditsAdded: packSize,
    totalCredits: updatedCredits.totalCredits,
    message: `${packSize}건 추가 크레딧이 충전되었습니다. (30일 유효)`,
  })
}
