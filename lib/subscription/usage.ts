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

export async function getCurrentUserPlan(): Promise<PlanId> {
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
  const supabase = await createClient()
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
  const planId = await getCurrentUserPlan()
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
