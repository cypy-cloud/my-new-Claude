import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PortOneProvider } from '@/lib/billing/portone-provider'
import { activateSubscription, recordPayment } from '@/lib/billing/subscription-service'
import { validateDiscountCode, redeemDiscountCode } from '@/lib/billing/discount'
import { PLANS, PLAN_LABELS, type PlanId } from '@/lib/subscription/plans'

const PLAN_RANK: Record<PlanId, number> = { free: 0, basic: 1, pro: 2, premium: 3 }
const PAYABLE_PLANS: PlanId[] = ['basic', 'pro', 'premium']

// KPN이 발급한 MID가 정기결제(빌링키) 전용이라 일반(단건)결제는 지원되지 않음
// (2026-07-21 KPN 확인 — 이전 안내와 달리 카드사 재심사 없이는 단건결제 불가). 그래서
// 신규 구독·업그레이드도 이 라우트로 자동결제 카드를 등록(또는 이미 등록된 카드를 재사용)한
// 뒤 그 자리에서 첫 달 요금을 즉시 청구한다. 다운그레이드는 즉시 결제가 필요 없어
// 기존 /api/billing/checkout + /api/billing/verify 경로를 그대로 사용한다.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { planId, discountCode, billingKey: newBillingKey } = body as {
    planId: PlanId
    discountCode?: string
    billingKey?: string
  }

  if (!PAYABLE_PLANS.includes(planId)) {
    return NextResponse.json({ error: '유효하지 않은 요금제입니다' }, { status: 400 })
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('plan_type, portone_billing_key, portone_customer_id')
    .eq('id', user.id)
    .single()

  const currentPlan = (profile?.plan_type as PlanId) ?? 'free'
  if (currentPlan === planId) {
    return NextResponse.json({ error: '이미 해당 요금제를 사용 중입니다' }, { status: 400 })
  }
  if (PLAN_RANK[planId] < PLAN_RANK[currentPlan]) {
    return NextResponse.json({ error: '다운그레이드는 요금제 화면에서 진행해주세요' }, { status: 400 })
  }

  // amount는 클라이언트가 함께 보내는 값이 아니라 서버가 직접 재계산한다 — 할인코드
  // 위변조로 임의 할인가 결제를 막기 위함 (/api/billing/verify와 동일한 원칙)
  let discountResult: Awaited<ReturnType<typeof validateDiscountCode>> | null = null
  if (discountCode) {
    discountResult = await validateDiscountCode(discountCode, planId, user.id)
  }
  const amount = discountResult?.valid ? discountResult.discountedAmount! : PLANS[planId].price

  const provider = new PortOneProvider()

  // 이미 등록된 자동결제 카드가 있으면 재사용, 없으면 이번에 새로 발급받은 billingKey를
  // 검증 후 저장한다 (등록 자체는 클라이언트에서 PortOne.requestIssueBillingKey로 이미 완료됨).
  let billingKey = profile?.portone_billing_key as string | undefined
  let customerId = profile?.portone_customer_id as string | undefined

  if (!billingKey) {
    if (!newBillingKey) {
      return NextResponse.json({ error: '자동결제 카드 등록이 필요합니다', needsCardRegistration: true }, { status: 400 })
    }
    const verified = await provider.verifyBillingKey(newBillingKey)
    if (!verified.success || !verified.billingKey || !verified.customerId) {
      return NextResponse.json({ error: verified.error ?? '카드 등록에 실패했습니다' }, { status: 400 })
    }
    // customerId는 이 유저 소유의 것인지 확인 (다른 유저의 카드가 잘못 연결되는 것 방지)
    const expectedCustomerId = `fp_${user.id.replace(/-/g, '').slice(0, 20)}`
    if (verified.customerId !== expectedCustomerId) {
      return NextResponse.json({ error: '유효하지 않은 요청입니다' }, { status: 400 })
    }

    await (supabase as any)
      .from('profiles')
      .update({
        portone_billing_key: verified.billingKey,
        portone_customer_id: verified.customerId,
        billing_card_last4: verified.cardLast4 ?? null,
        billing_card_brand: verified.cardBrand ?? null,
        billing_key_registered_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    billingKey = verified.billingKey
    customerId = verified.customerId
  }

  const paymentId = `sub${user.id.replace(/-/g, '').slice(0, 10)}${Date.now()}`
  const chargeResult = await provider.chargeBillingKey({
    billingKey: billingKey!,
    customerId: customerId!,
    amount,
    paymentId,
    orderName: `FP AI Assistant ${PLAN_LABELS[planId]} 플랜 (월간)`,
  })

  if (!chargeResult.success) {
    await recordPayment({
      userId: user.id,
      amount,
      provider: 'portone',
      providerTxId: paymentId,
      status: 'failed',
      metadata: { error: chargeResult.error },
    }).catch(() => null)

    return NextResponse.json({ error: chargeResult.error ?? '결제에 실패했습니다' }, { status: 400 })
  }

  const now = new Date()
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

  const subscription = await activateSubscription({
    userId: user.id,
    planType: planId,
    provider: 'portone',
    providerCustomerId: customerId,
    providerSubscriptionId: chargeResult.paymentId ?? paymentId,
    billingInterval: 'month',
    periodEnd,
  })

  if (discountResult?.valid && discountResult.codeId && discountResult.discountPercent) {
    await redeemDiscountCode(discountResult.codeId, user.id, planId, discountResult.discountPercent).catch(() => null)
  }

  await recordPayment({
    userId: user.id,
    subscriptionId: subscription.id,
    amount,
    provider: 'portone',
    providerTxId: chargeResult.paymentId ?? paymentId,
    status: 'succeeded',
    paidAt: new Date(),
    metadata: discountResult?.valid ? { discountCode: discountCode?.trim().toUpperCase(), discountPercent: discountResult.discountPercent } : undefined,
  }).catch(() => null)

  return NextResponse.json({
    ok: true,
    planId,
    message: `${PLAN_LABELS[planId]} 플랜으로 변경되었습니다!`,
  })
}
