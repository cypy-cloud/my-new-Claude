import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS, type PlanId } from '@/lib/subscription/plans'

const DISCOUNTABLE_PLANS: PlanId[] = ['basic', 'pro', 'premium']

export interface DiscountValidationResult {
  valid: boolean
  error?: string
  discountPercent?: number
  discountedAmount?: number
  codeId?: string
}

// 코드 유효성 확인 + 해당 플랜에 적용될 할인가 계산.
// 체크아웃 화면의 "적용" 버튼과 결제 검증(verify) 양쪽에서 공유해서 쓴다 —
// 클라이언트 쪽 계산은 화면 표시용일 뿐, 실제 금액 확정은 항상 서버(verify)에서
// 이 함수를 다시 호출해 재검증한다.
export async function validateDiscountCode(
  rawCode: string,
  planId: PlanId,
  userId: string
): Promise<DiscountValidationResult> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return { valid: false, error: '할인코드를 입력해주세요' }
  if (!DISCOUNTABLE_PLANS.includes(planId)) {
    return { valid: false, error: '이 플랜에는 할인코드를 적용할 수 없습니다' }
  }

  const admin = createAdminClient()

  const { data: discountCode } = await (admin as any)
    .from('discount_codes')
    .select('id, discount_percent, discount_months, max_redemptions, redemption_count, valid_until, is_active')
    .eq('code', code)
    .maybeSingle()

  if (!discountCode || !discountCode.is_active) {
    return { valid: false, error: '유효하지 않은 할인코드입니다' }
  }
  if (new Date(discountCode.valid_until) < new Date()) {
    return { valid: false, error: '할인코드 유효기간이 지났습니다' }
  }
  if (discountCode.redemption_count >= discountCode.max_redemptions) {
    return { valid: false, error: '할인코드 선착순 인원이 마감되었습니다' }
  }

  // 계정당 1회만 — 이미 이 계정으로 사용한 할인(다른 코드 포함)이 있으면 거절
  const { data: existing } = await (admin as any)
    .from('discount_code_redemptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (existing) {
    return { valid: false, error: '이미 할인코드를 사용하셨습니다 (계정당 1회)' }
  }

  const percentMap = discountCode.discount_percent as Record<string, number>
  const percent = percentMap?.[planId]
  if (!percent || percent <= 0) {
    return { valid: false, error: '이 플랜에는 할인코드를 적용할 수 없습니다' }
  }

  const price = PLANS[planId].price
  const discountedAmount = Math.round(price * (1 - percent / 100))

  return { valid: true, discountPercent: percent, discountedAmount, codeId: discountCode.id }
}

// 결제 성공 시 1회 호출 — 선착순 카운트 증가 + 계정별 사용 기록 생성.
export async function redeemDiscountCode(
  codeId: string,
  userId: string,
  planId: PlanId,
  discountPercent: number
): Promise<void> {
  const admin = createAdminClient()

  const { data: discountCode } = await (admin as any)
    .from('discount_codes')
    .select('discount_months, redemption_count')
    .eq('id', codeId)
    .single()
  if (!discountCode) return

  await (admin as any)
    .from('discount_code_redemptions')
    .insert({
      code_id: codeId,
      user_id: userId,
      plan_id: planId,
      discount_percent: discountPercent,
      months_total: discountCode.discount_months,
      months_used: 1, // 최초 결제 = 1회차 사용
    })

  await (admin as any)
    .from('discount_codes')
    .update({ redemption_count: discountCode.redemption_count + 1 })
    .eq('id', codeId)
}

export interface ActiveRedemption {
  planId: PlanId
  discountPercent: number
  monthsUsed: number
  monthsTotal: number
}

// 정기결제(크론) 갱신 시 이 유저에게 아직 남은 할인 회차가 있는지 확인.
export async function getActiveRedemption(userId: string): Promise<ActiveRedemption | null> {
  const admin = createAdminClient()
  const { data } = await (admin as any)
    .from('discount_code_redemptions')
    .select('plan_id, discount_percent, months_used, months_total')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data || data.months_used >= data.months_total) return null

  return {
    planId: data.plan_id as PlanId,
    discountPercent: data.discount_percent,
    monthsUsed: data.months_used,
    monthsTotal: data.months_total,
  }
}

// 정기결제 갱신 성공 후 회차 1 증가.
export async function incrementRedemptionUsage(userId: string): Promise<void> {
  const admin = createAdminClient()
  const { data } = await (admin as any)
    .from('discount_code_redemptions')
    .select('months_used')
    .eq('user_id', userId)
    .single()
  if (!data) return

  await (admin as any)
    .from('discount_code_redemptions')
    .update({ months_used: data.months_used + 1 })
    .eq('user_id', userId)
}
