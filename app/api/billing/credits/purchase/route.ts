import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addExtraCredits, getExtraCredits } from '@/lib/subscription/usage'
import { getBillingAdapter } from '@/lib/billing/billing-provider'

// 10건 팩: 건당 ₩200
const PACK_SIZE = 10
const PACK_PRICE = 2000
const FEATURE_TYPES = ['script', 'sms', 'followup', 'all'] as const
type FeatureType = typeof FEATURE_TYPES[number]

// GET: 현재 크레딧 잔여량 조회
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const url = new URL(request.url)
  const featureType = (url.searchParams.get('feature') ?? 'all') as FeatureType

  const credits = await getExtraCredits(user.id, featureType)
  return NextResponse.json(credits)
}

// POST: 크레딧 구매 확정 (Toss 결제 완료 후 호출)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { paymentKey, orderId, amount, featureType = 'all' } = body as {
    paymentKey: string
    orderId: string
    amount: number
    featureType?: FeatureType
  }

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json({ error: 'paymentKey, orderId, amount 필수' }, { status: 400 })
  }

  if (amount !== PACK_PRICE) {
    return NextResponse.json({ error: `결제 금액이 올바르지 않습니다 (expected ₩${PACK_PRICE})` }, { status: 400 })
  }

  // Toss 결제 검증
  const adapter = await getBillingAdapter()
  const result = await adapter.verifyPayment({ sessionId: orderId, paymentKey, orderId, amount })

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? '결제 확인에 실패했습니다' }, { status: 400 })
  }

  // DB에 크레딧 추가
  await addExtraCredits({
    userId: user.id,
    featureType,
    packSize: PACK_SIZE,
    amountPaid: amount,
    orderId,
    paymentKey,
  })

  const updatedCredits = await getExtraCredits(user.id, featureType)
  return NextResponse.json({
    success: true,
    creditsAdded: PACK_SIZE,
    totalCredits: updatedCredits.totalCredits,
    message: `${PACK_SIZE}건 추가 크레딧이 충전되었습니다. (30일 유효)`,
  })
}
