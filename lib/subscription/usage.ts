import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlanLimits, type PlanId, type PlanLimits } from './plans'

export type UsageFeature = 'sms' | 'script' | 'pdf_upload' | 'pdf_analysis' | 'content' | 'newsletter'

export interface MonthlyUsageData {
  smsCount: number
  scriptCount: number
  pdfUploadCount: number
  pdfAnalysisCount: number
  contentCount: number
  newsletterCount: number
  storageMb: number
  tokenInput: number
  tokenOutput: number
  costEstimate: number
}

export interface UsageLimitCheck {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  planId: PlanId
}

// Claude Sonnet 5 할인가 (USD per token, ~2026-08-31까지, CLAUDE.md 기준)
const TOKEN_COST = {
  input: 2.0 / 1_000_000,
  output: 10.0 / 1_000_000,
}

// userId를 넘기면 세션(로그인된 사용자)이 아닌 해당 유저 본인의 플랜을 admin client로 직접
// 조회한다 — 팀원이 요청한 건을 팀장 한도로 대신 확인해야 하는 경우(reserveUsage)에 필요.
// 인자 없이 호출하면 기존과 동일하게 세션 유저 기준으로 동작한다(하위 호환).
export async function getCurrentUserPlan(userId?: string): Promise<PlanId> {
  if (userId) {
    const admin = createAdminClient()
    const { data: profile } = await (admin as any)
      .from('profiles')
      .select('plan_type')
      .eq('id', userId)
      .single()
    return (profile?.plan_type as PlanId) ?? 'free'
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'free'

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('plan_type, scheduled_plan_type, scheduled_plan_date')
    .eq('id', user.id)
    .single()

  return (profile?.plan_type as PlanId) ?? 'free'
}

export interface PlanStatus {
  currentPlan: PlanId
  scheduledPlan: PlanId | null
  scheduledDate: string | null
}

export async function getCurrentUserPlanStatus(): Promise<PlanStatus> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { currentPlan: 'free', scheduledPlan: null, scheduledDate: null }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('plan_type, scheduled_plan_type, scheduled_plan_date')
    .eq('id', user.id)
    .single()

  return {
    currentPlan: (profile?.plan_type as PlanId) ?? 'free',
    scheduledPlan: (profile?.scheduled_plan_type as PlanId) ?? null,
    scheduledDate: profile?.scheduled_plan_date ?? null,
  }
}

export async function getMonthlyUsage(userId: string): Promise<MonthlyUsageData> {
  // admin client 사용 — usage_records RLS는 auth.uid() = user_id라, 팀원 세션에서 팀장의
  // 사용량을 조회하려는 reserveUsage() 경로가 RLS에 막혀 항상 0으로 보이는 것을 방지한다.
  // 기존 "본인 사용량 조회" 호출부는 어차피 RLS를 통과하던 케이스라 결과는 동일하다.
  const supabase = createAdminClient()
  const month = new Date().toISOString().slice(0, 7)

  const { data } = await (supabase as any)
    .from('usage_records')
    .select('sms_count, script_count, pdf_upload_count, pdf_analysis_count, content_count, newsletter_count, storage_used_mb, ai_token_input, ai_token_output, ai_cost_estimate')
    .eq('user_id', userId)
    .eq('usage_month', month)
    .maybeSingle()

  return {
    smsCount: data?.sms_count ?? 0,
    scriptCount: data?.script_count ?? 0,
    pdfUploadCount: data?.pdf_upload_count ?? 0,
    pdfAnalysisCount: data?.pdf_analysis_count ?? 0,
    contentCount: data?.content_count ?? 0,
    newsletterCount: data?.newsletter_count ?? 0,
    storageMb: data?.storage_used_mb ?? 0,
    tokenInput: data?.ai_token_input ?? 0,
    tokenOutput: data?.ai_token_output ?? 0,
    costEstimate: data?.ai_cost_estimate ?? 0,
  }
}

export async function checkUsageLimit(userId: string, feature: UsageFeature): Promise<UsageLimitCheck> {
  // userId는 항상 호출자 본인(세션 유저)의 id로만 넘어오던 기존 호출부와 100% 동일하게 동작한다 —
  // getCurrentUserPlan(userId)로 조회한 프로필이 세션 프로필과 같은 행이기 때문. reserveUsage()에서
  // 팀장의 id를 넘길 때만 실제로 "다른 사람"의 플랜을 조회하는 새 경로를 타게 된다.
  const planId = await getCurrentUserPlan(userId)
  const limits = getPlanLimits(planId)
  const usage = await getMonthlyUsage(userId)

  const { used, limit } = getFeatureCounts(feature, usage, limits)
  const remaining = Math.max(0, limit - used)

  return { allowed: used < limit, used, limit, remaining, planId }
}

export async function incrementUsage(
  userId: string,
  feature: UsageFeature,
  opts: { tokenInput?: number; tokenOutput?: number; storageMb?: number } = {}
): Promise<void> {
  const supabase = await createClient()
  const cost = estimateAiCost(opts.tokenInput ?? 0, opts.tokenOutput ?? 0)

  // 한도 초과 여부 확인 후 크레딧 차감
  const check = await checkUsageLimit(userId, feature)
  if (!check.allowed) {
    const creditFeature = feature === 'sms' ? 'sms' : feature === 'script' ? 'script' : 'all'
    await consumeExtraCredit(userId, creditFeature as any)
  }

  await (supabase as any).rpc('increment_usage_record', {
    p_user_id: userId,
    p_feature: feature,
    p_token_input: opts.tokenInput ?? 0,
    p_token_output: opts.tokenOutput ?? 0,
    p_cost: cost,
    p_storage_mb: opts.storageMb ?? 0,
  })

  // Keep legacy monthly_usage in sync
  if (feature === 'sms' || feature === 'script' || feature === 'pdf_analysis') {
    const legacyFeature = feature === 'sms' ? 'ai_message' : feature === 'script' ? 'ai_script' : 'ai_document'
    await (supabase as any).rpc('increment_usage', { p_user_id: userId, p_feature: legacyFeature })
  }
}

export function estimateAiCost(inputTokens: number, outputTokens: number): number {
  return inputTokens * TOKEN_COST.input + outputTokens * TOKEN_COST.output
}

export async function blockIfLimitExceeded(userId: string, feature: UsageFeature): Promise<void> {
  const check = await checkUsageLimit(userId, feature)
  if (!check.allowed) {
    // 추가 크레딧 확인
    const creditFeature = feature === 'sms' ? 'sms' : feature === 'script' ? 'script' : 'all'
    const credits = await getExtraCredits(userId, creditFeature as any)
    if (credits.totalCredits > 0) return // 크레딧 있으면 통과 (incrementUsage 시 차감)

    throw new UsageLimitError(
      `이번 달 사용 한도(${check.limit}회)를 초과했습니다. 추가 크레딧을 구매하거나 플랜을 업그레이드해주세요.`,
      check
    )
  }
}

export class UsageLimitError extends Error {
  constructor(message: string, public readonly check: UsageLimitCheck) {
    super(message)
    this.name = 'UsageLimitError'
  }
}

// ── 팀 한도 대여 (팀원이 본인 한도를 다 쓰면 팀장의 남은 한도에서 대신 차감) ──────────

async function getTeamOwnerIdForMember(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data: membership } = await (admin as any)
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)
    .maybeSingle()

  // 팀 미소속이거나 본인이 팀장(owner)이면 대여할 대상이 없다
  if (!membership || membership.role === 'owner') return null

  const { data: team } = await (admin as any)
    .from('teams')
    .select('owner_user_id')
    .eq('id', membership.team_id)
    .single()

  return team?.owner_user_id ?? null
}

export interface UsageReservation {
  payerId: string          // 실제로 usage_records가 차감될 대상 — incrementUsage에 이 값을 넘길 것
  borrowedFromTeam: boolean
}

/**
 * blockIfLimitExceeded와 동일하게 동작하되, 본인 한도(+크레딧)를 모두 소진한 팀원의 경우
 * 소속 팀장의 남은 한도가 있으면 예외를 던지지 않고 payerId를 팀장 id로 반환한다.
 * 팀장 본인 호출, 팀 미소속, 팀장도 한도 소진인 경우는 기존과 동일하게 UsageLimitError를 던진다.
 */
export async function reserveUsage(userId: string, feature: UsageFeature): Promise<UsageReservation> {
  try {
    await blockIfLimitExceeded(userId, feature)
    return { payerId: userId, borrowedFromTeam: false }
  } catch (err) {
    if (!(err instanceof UsageLimitError)) throw err

    const ownerId = await getTeamOwnerIdForMember(userId)
    if (!ownerId) throw err

    const ownerCheck = await checkUsageLimit(ownerId, feature)
    if (!ownerCheck.allowed) throw err

    return { payerId: ownerId, borrowedFromTeam: true }
  }
}

// ── Extra Credits ─────────────────────────────────────────────────────────────

export interface ExtraCreditsInfo {
  totalCredits: number   // 유효한 총 잔여 크레딧
  packs: Array<{ id: string; credits: number; expiresAt: string }>
}

/** 유효한 추가 크레딧 조회 (만료되지 않은 것만) */
export async function getExtraCredits(userId: string, featureType: 'script' | 'sms' | 'all' = 'all'): Promise<ExtraCreditsInfo> {
  const supabase = createAdminClient()
  const { data } = await (supabase as any)
    .from('user_extra_credits')
    .select('id, credits, expires_at')
    .eq('user_id', userId)
    .in('feature_type', [featureType, 'all'])
    .gt('credits', 0)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })

  const packs = (data ?? []).map((r: any) => ({
    id: r.id,
    credits: r.credits,
    expiresAt: r.expires_at,
  }))

  return {
    totalCredits: packs.reduce((sum: number, p: any) => sum + p.credits, 0),
    packs,
  }
}

/** 추가 크레딧에서 1건 차감 (만료 빠른 팩부터) */
export async function consumeExtraCredit(userId: string, featureType: 'script' | 'sms' | 'all' = 'all'): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await (supabase as any)
    .from('user_extra_credits')
    .select('id, credits')
    .eq('user_id', userId)
    .in('feature_type', [featureType, 'all'])
    .gt('credits', 0)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!data) return false

  await (supabase as any)
    .from('user_extra_credits')
    .update({ credits: data.credits - 1 })
    .eq('id', data.id)

  return true
}

/** 크레딧 구매 후 DB에 추가 */
export async function addExtraCredits(params: {
  userId: string
  featureType: 'script' | 'sms' | 'all'
  packSize: number
  amountPaid: number
  orderId: string
  paymentKey: string
}): Promise<void> {
  const supabase = createAdminClient()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30일

  await (supabase as any)
    .from('user_extra_credits')
    .insert({
      user_id: params.userId,
      feature_type: params.featureType,
      credits: params.packSize,
      pack_size: params.packSize,
      amount_paid: params.amountPaid,
      order_id: params.orderId,
      payment_key: params.paymentKey,
      expires_at: expiresAt,
    })
}

function getFeatureCounts(
  feature: UsageFeature,
  usage: MonthlyUsageData,
  limits: PlanLimits
): { used: number; limit: number } {
  switch (feature) {
    case 'sms':          return { used: usage.smsCount,         limit: limits.smsLimit }
    case 'script':       return { used: usage.scriptCount,      limit: limits.scriptLimit }
    case 'pdf_upload':   return { used: usage.pdfUploadCount,   limit: limits.pdfUploadLimit }
    case 'pdf_analysis': return { used: usage.pdfAnalysisCount, limit: limits.pdfAnalysisLimit }
    case 'content':      return { used: usage.contentCount,     limit: limits.contentLimit }
    case 'newsletter':   return { used: usage.newsletterCount,  limit: limits.newsletterLimit }
  }
}
