import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS, PLAN_LABELS } from '@/lib/subscription/plans'
import type { Payment } from './subscription-service'

export interface Invoice {
  invoiceNumber: string
  issuedAt: string
  userId: string
  userEmail: string
  userName: string | null
  planType: string
  planLabel: string
  amount: number
  currency: string
  provider: string
  providerTxId: string | null
  status: string
  paidAt: string | null
  periodStart?: string
  periodEnd?: string
}

// 결제 레코드 → 인보이스 형식으로 변환
export function paymentToInvoice(
  payment: Payment & { email?: string; fullName?: string | null; periodStart?: string; periodEnd?: string; planType?: string }
): Invoice {
  return {
    invoiceNumber: `FP-${payment.createdAt.slice(0, 7).replace('-', '')}-${payment.id.slice(0, 8).toUpperCase()}`,
    issuedAt: payment.createdAt,
    userId: payment.userId,
    userEmail: payment.email ?? '',
    userName: payment.fullName ?? null,
    planType: payment.planType ?? '',
    planLabel: PLAN_LABELS[payment.planType as keyof typeof PLAN_LABELS] ?? payment.planType ?? '',
    amount: payment.amount,
    currency: payment.currency,
    provider: payment.provider,
    providerTxId: payment.providerTxId,
    status: payment.status,
    paidAt: payment.paidAt,
    periodStart: payment.periodStart,
    periodEnd: payment.periodEnd,
  }
}

// 사용자의 인보이스 목록 조회
export async function getUserInvoices(userId: string, limit = 24): Promise<Invoice[]> {
  const admin = createAdminClient()
  const { data } = await (admin as any)
    .from('payments')
    .select(`
      *,
      profiles!inner(email, full_name),
      subscriptions(plan_type, current_period_start, current_period_end)
    `)
    .eq('user_id', userId)
    .eq('status', 'succeeded')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((row: any) =>
    paymentToInvoice({
      id: row.id,
      userId: row.user_id,
      subscriptionId: row.subscription_id,
      amount: row.amount,
      currency: row.currency,
      provider: row.provider,
      providerTxId: row.provider_tx_id,
      status: row.status,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      email: row.profiles?.email ?? '',
      fullName: row.profiles?.full_name ?? null,
      planType: row.subscriptions?.plan_type ?? '',
      periodStart: row.subscriptions?.current_period_start,
      periodEnd: row.subscriptions?.current_period_end,
    })
  )
}

// 관리자용 전체 인보이스 조회 + 월별 매출 요약
export async function adminGetRevenueStats(): Promise<{
  totalRevenue: number
  monthlyRevenue: { month: string; amount: number; count: number }[]
  byProvider: { provider: string; amount: number; count: number }[]
  byPlan: { planType: string; planLabel: string; amount: number; count: number }[]
}> {
  const admin = createAdminClient()

  // 최근 12개월 성공 결제
  const since = new Date()
  since.setMonth(since.getMonth() - 11)
  since.setDate(1)

  const { data: payments } = await (admin as any)
    .from('payments')
    .select('amount, provider, created_at, subscription_id, subscriptions(plan_type)')
    .eq('status', 'succeeded')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  const rows: any[] = payments ?? []

  const totalRevenue = rows.reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0)

  // 월별
  const monthMap = new Map<string, { amount: number; count: number }>()
  for (const r of rows) {
    const month = r.created_at.slice(0, 7)
    const cur = monthMap.get(month) ?? { amount: 0, count: 0 }
    cur.amount += r.amount ?? 0
    cur.count++
    monthMap.set(month, cur)
  }
  const monthlyRevenue = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }))

  // 공급자별
  const providerMap = new Map<string, { amount: number; count: number }>()
  for (const r of rows) {
    const cur = providerMap.get(r.provider) ?? { amount: 0, count: 0 }
    cur.amount += r.amount ?? 0
    cur.count++
    providerMap.set(r.provider, cur)
  }
  const byProvider = Array.from(providerMap.entries())
    .map(([provider, v]) => ({ provider, ...v }))

  // 플랜별
  const planMap = new Map<string, { amount: number; count: number }>()
  for (const r of rows) {
    const pt = r.subscriptions?.plan_type ?? 'unknown'
    const cur = planMap.get(pt) ?? { amount: 0, count: 0 }
    cur.amount += r.amount ?? 0
    cur.count++
    planMap.set(pt, cur)
  }
  const byPlan = Array.from(planMap.entries()).map(([planType, v]) => ({
    planType,
    planLabel: PLAN_LABELS[planType as keyof typeof PLAN_LABELS] ?? planType,
    ...v,
  }))

  return { totalRevenue, monthlyRevenue, byProvider, byPlan }
}

// 다음 결제 예정일 계산 (갱신 주기: 매월 같은 날)
export function getNextBillingDate(currentPeriodEnd: string): Date {
  return new Date(currentPeriodEnd)
}

// 요금제 가격 포맷
export function formatAmount(amount: number, currency = 'KRW'): string {
  if (currency === 'KRW') return `₩${amount.toLocaleString('ko-KR')}`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100)
}

// 플랜 정보와 함께 결제 요약 반환
export function getPlanSummary(planType: string) {
  const plan = PLANS[planType as keyof typeof PLANS]
  if (!plan) return null
  return {
    id: plan.id,
    name: plan.name,
    price: plan.price,
    formattedPrice: formatAmount(plan.price),
    limits: {
      sms: plan.smsLimit,
      script: plan.scriptLimit,
      pdf: plan.pdfAnalysisLimit,
    },
  }
}
