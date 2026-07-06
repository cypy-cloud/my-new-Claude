import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addExtraCredits, getExtraCredits } from '@/lib/subscription/usage'
import { getBillingAdapter } from '@/lib/billing/billing-provider'
import { VALID_PACK_MAP } from '@/lib/billing/credit-packs'
import type { PlanId } from '@/lib/subscription/plans'

const PAID_PLANS: PlanId[] = ['basic', 'pro', 'premium']

// GET: 현재 크레딧 잔여량 조회
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const url = new URL(request.url)
  const featureType = (url.searchParams.get('feature') ?? 'all') as 'script' | 'sms' | 'followup' | 'all'

  const credits = await getExtraCredits(user.id, featureType)
  return NextResponse.json(credits)
}

// POST: 크레딧 구매 확정 (PG 결제 완료 후 호출)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  // 유료 플랜 여부 확인
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('plan_type')
    .eq('id', user.id)
    .single()

  const planId = (profile?.plan_type as PlanId) ?? 'free'
  if (!PAID_PLANS.includes(planId)) {
    return NextResponse.json({ error: '추가 크레딧 구매는 유료 플랜(Basic 이상)에서만 가능합니다' }, { status: 403 })
  }

  const body = await request.json()
  const { paymentKey, orderId, amount, packSize, featureType = 'all' } = body as {
    paymentKey: string
    orderId: string
    amount: number
    packSize?: number
    featureType?: 'script' | 'sms' | 'followup' | 'all'
  }

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json({ error: 'paymentKey, orderId, amount 필수' }, { status: 400 })
  }

  // packSize 추론: amount로 역산하거나 명시된 값 사용
  const resolvedPackSize = packSize ?? Object.entries(VALID_PACK_MAP).find(([, p]) => p === amount)?.[0]
  if (!resolvedPackSize || VALID_PACK_MAP[Number(resolvedPackSize)] !== amount) {
    return NextResponse.json({ error: '유효하지 않은 팩 금액입니다' }, { status: 400 })
  }
  const finalPackSize = Number(resolvedPackSize)

  // PG 결제 검증
  const adapter = await getBillingAdapter()
  const result = await adapter.verifyPayment({ sessionId: orderId, paymentKey, orderId, amount })

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? '결제 확인에 실패했습니다' }, { status: 400 })
  }

  // DB에 크레딧 추가
  await addExtraCredits({
    userId: user.id,
    featureType,
    packSize: finalPackSize,
    amountPaid: amount,
    orderId,
    paymentKey,
  })

  const updatedCredits = await getExtraCredits(user.id, featureType)
  return NextResponse.json({
    success: true,
    creditsAdded: finalPackSize,
    totalCredits: updatedCredits.totalCredits,
    message: `${finalPackSize}건 추가 크레딧이 충전되었습니다. (30일 유효)`,
  })
}
