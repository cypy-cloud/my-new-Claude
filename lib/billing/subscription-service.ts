import { createAdminClient } from '@/lib/supabase/admin'
import type { PlanId } from '@/lib/subscription/plans'
import type { BillingProvider, SubscriptionStatus, PaymentStatus } from './billing-provider'

export interface Subscription {
  id: string
  userId: string
  planType: PlanId
  status: SubscriptionStatus
  provider: BillingProvider
  providerCustomerId: string | null
  providerSubscriptionId: string | null
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  userId: string
  subscriptionId: string | null
  amount: number
  currency: string
  provider: BillingProvider
  providerTxId: string | null
  status: PaymentStatus
  paidAt: string | null
  createdAt: string
}

// ── 구독 조회 ──────────────────────────────────────────────────────────────

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const admin = createAdminClient()
  const { data } = await (admin as any)
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? rowToSubscription(data) : null
}

// ── 구독 생성 / 활성화 (결제 성공 후 호출) ───────────────────────────────

export async function activateSubscription(params: {
  userId: string
  planType: PlanId
  provider: BillingProvider
  providerCustomerId?: string
  providerSubscriptionId?: string
  periodStart?: Date
  periodEnd?: Date
}): Promise<Subscription> {
  const admin = createAdminClient()
  const now = new Date()
  const start = params.periodStart ?? now
  const end = params.periodEnd ?? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

  // upsert: user_id 기준으로 기존 구독 업데이트 또는 새로 생성
  const { data, error } = await (admin as any)
    .from('subscriptions')
    .upsert({
      user_id: params.userId,
      plan_type: params.planType,
      status: 'active',
      provider: params.provider,
      provider_customer_id: params.providerCustomerId ?? null,
      provider_subscription_id: params.providerSubscriptionId ?? null,
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      cancel_at_period_end: false,
      updated_at: now.toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw new Error(`구독 활성화 실패: ${error.message}`)

  // profiles.plan_type 동기화
  await (admin as any)
    .from('profiles')
    .update({ plan_type: params.planType })
    .eq('id', params.userId)

  return rowToSubscription(data)
}

// ── 구독 취소 처리 ──────────────────────────────────────────────────────────

export async function cancelSubscription(params: {
  userId: string
  immediately?: boolean
}): Promise<void> {
  const admin = createAdminClient()
  const update = params.immediately
    ? { status: 'canceled' as SubscriptionStatus, cancel_at_period_end: false, updated_at: new Date().toISOString() }
    : { cancel_at_period_end: true, updated_at: new Date().toISOString() }

  await (admin as any)
    .from('subscriptions')
    .update(update)
    .eq('user_id', params.userId)

  if (params.immediately) {
    await (admin as any)
      .from('profiles')
      .update({ plan_type: 'free' })
      .eq('id', params.userId)
  }
}

// ── 구독 만료 처리 (cron 또는 웹훅에서 호출) ──────────────────────────────

export async function expireSubscription(userId: string): Promise<void> {
  const admin = createAdminClient()
  await (admin as any)
    .from('subscriptions')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  await (admin as any)
    .from('profiles')
    .update({ plan_type: 'free' })
    .eq('id', userId)
}

// ── 연체 처리 (결제 실패 후 호출) ──────────────────────────────────────────

export async function markPastDue(userId: string): Promise<void> {
  const admin = createAdminClient()
  await (admin as any)
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
}

// ── 결제 기록 ──────────────────────────────────────────────────────────────

export async function recordPayment(params: {
  userId: string
  subscriptionId?: string
  amount: number
  currency?: string
  provider: BillingProvider
  providerTxId?: string
  status: PaymentStatus
  paidAt?: Date
  metadata?: Record<string, unknown>
}): Promise<Payment> {
  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('payments')
    .insert({
      user_id: params.userId,
      subscription_id: params.subscriptionId ?? null,
      amount: params.amount,
      currency: params.currency ?? 'KRW',
      provider: params.provider,
      provider_tx_id: params.providerTxId ?? null,
      status: params.status,
      paid_at: params.status === 'succeeded' ? (params.paidAt ?? new Date()).toISOString() : null,
      metadata: params.metadata ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`결제 기록 실패: ${error.message}`)
  return rowToPayment(data)
}

// ── 결제 이력 조회 ──────────────────────────────────────────────────────────

export async function getPayments(userId: string, limit = 20): Promise<Payment[]> {
  const admin = createAdminClient()
  const { data } = await (admin as any)
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map(rowToPayment)
}

// ── 관리자용 전체 구독/결제 조회 ────────────────────────────────────────────

export async function adminListSubscriptions(params: {
  status?: SubscriptionStatus
  provider?: BillingProvider
  limit?: number
  offset?: number
}): Promise<{ subscriptions: (Subscription & { email: string; fullName: string | null })[]; total: number }> {
  const admin = createAdminClient()
  const limit = params.limit ?? 50
  const offset = params.offset ?? 0

  let query = (admin as any)
    .from('subscriptions')
    .select('*, profiles!inner(email, full_name)', { count: 'exact' })

  if (params.status) query = query.eq('status', params.status)
  if (params.provider) query = query.eq('provider', params.provider)

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const subscriptions = (data ?? []).map((row: any) => ({
    ...rowToSubscription(row),
    email: row.profiles?.email ?? '',
    fullName: row.profiles?.full_name ?? null,
  }))

  return { subscriptions, total: count ?? 0 }
}

export async function adminListPayments(params: {
  status?: PaymentStatus
  provider?: BillingProvider
  limit?: number
  offset?: number
}): Promise<{ payments: (Payment & { email: string })[]; total: number }> {
  const admin = createAdminClient()
  const limit = params.limit ?? 50
  const offset = params.offset ?? 0

  let query = (admin as any)
    .from('payments')
    .select('*, profiles!inner(email)', { count: 'exact' })

  if (params.status) query = query.eq('status', params.status)
  if (params.provider) query = query.eq('provider', params.provider)

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const payments = (data ?? []).map((row: any) => ({
    ...rowToPayment(row),
    email: row.profiles?.email ?? '',
  }))

  return { payments, total: count ?? 0 }
}

// ── 내부 변환 헬퍼 ──────────────────────────────────────────────────────────

function rowToSubscription(row: any): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    planType: row.plan_type,
    status: row.status,
    provider: row.provider,
    providerCustomerId: row.provider_customer_id ?? null,
    providerSubscriptionId: row.provider_subscription_id ?? null,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToPayment(row: any): Payment {
  return {
    id: row.id,
    userId: row.user_id,
    subscriptionId: row.subscription_id ?? null,
    amount: row.amount,
    currency: row.currency ?? 'KRW',
    provider: row.provider,
    providerTxId: row.provider_tx_id ?? null,
    status: row.status,
    paidAt: row.paid_at ?? null,
    createdAt: row.created_at,
  }
}
