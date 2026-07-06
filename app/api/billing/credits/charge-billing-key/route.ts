import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addExtraCredits, getExtraCredits } from '@/lib/subscription/usage'
import { TossProvider } from '@/lib/billing/toss-provider'
import { VALID_PACK_MAP } from '@/lib/billing/credit-packs'
import type { PlanId } from '@/lib/subscription/plans'

const PAID_PLANS: PlanId[] = ['basic', 'pro', 'premium']

// 등록된 빌링키로 원클릭 크레딧 결제 (Toss 결제 페이지 이동 없이 즉시 청구)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('plan_type, toss_billing_key, toss_customer_key')
    .eq('id', user.id)
    .single()

  const planId = (profile?.plan_type as PlanId) ?? 'free'
  if (!PAID_PLANS.includes(planId)) {
    return NextResponse.json({ error: '추가 크레딧 구매는 유료 플랜(Basic 이상)에서만 가능합니다' }, { status: 403 })
  }
  if (!profile?.toss_billing_key || !profile?.toss_customer_key) {
    return NextResponse.json({ error: '등록된 자동결제 카드가 없습니다', noBillingKey: true }, { status: 400 })
  }

  const body = await request.json()
  const { packSize, featureType = 'all' } = body as {
    packSize?: number
    featureType?: 'script' | 'sms' | 'followup' | 'all'
  }

  const amount = packSize ? VALID_PACK_MAP[packSize] : undefined
  if (!packSize || !amount) {
    return NextResponse.json({ error: '유효하지 않은 팩입니다' }, { status: 400 })
  }

  const orderId = `credits-bk-${user.id.replace(/-/g, '').slice(0, 10)}-${Date.now()}`
  const provider = new TossProvider()
  const result = await provider.chargeBillingKey({
    billingKey: profile.toss_billing_key,
    customerKey: profile.toss_customer_key,
    amount,
    orderId,
    orderName: `FP AI Assistant 추가 크레딧 ${packSize}건`,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? '결제에 실패했습니다' }, { status: 400 })
  }

  await addExtraCredits({
    userId: user.id,
    featureType,
    packSize,
    amountPaid: amount,
    orderId,
    paymentKey: result.paymentKey ?? orderId,
  })

  const updatedCredits = await getExtraCredits(user.id, featureType)
  return NextResponse.json({
    success: true,
    creditsAdded: packSize,
    totalCredits: updatedCredits.totalCredits,
    message: `${packSize}건 추가 크레딧이 충전되었습니다. (30일 유효)`,
  })
}
