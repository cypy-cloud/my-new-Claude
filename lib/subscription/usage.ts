import { createClient } from '@/lib/supabase/server'
import { getPlanLimits, type PlanId, type PlanLimits } from './plans'

export type UsageFeature = 'sms' | 'script' | 'followup' | 'pdf_upload' | 'pdf_analysis'

export interface MonthlyUsageData {
  smsCount: number
  scriptCount: number
  followupCount: number
  pdfUploadCount: number
  pdfAnalysisCount: number
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

// Claude Sonnet pricing (USD per token)
const TOKEN_COST = {
  input: 3.0 / 1_000_000,
  output: 15.0 / 1_000_000,
}

export async function getCurrentUserPlan(): Promise<PlanId> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'free'

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('plan_type')
    .eq('id', user.id)
    .single()

  return (profile?.plan_type as PlanId) ?? 'free'
}

export async function getMonthlyUsage(userId: string): Promise<MonthlyUsageData> {
  const supabase = await createClient()
  const month = new Date().toISOString().slice(0, 7)

  const { data } = await (supabase as any)
    .from('usage_records')
    .select('sms_count, script_count, followup_count, pdf_upload_count, pdf_analysis_count, storage_used_mb, ai_token_input, ai_token_output, ai_cost_estimate')
    .eq('user_id', userId)
    .eq('usage_month', month)
    .maybeSingle()

  return {
    smsCount: data?.sms_count ?? 0,
    scriptCount: data?.script_count ?? 0,
    followupCount: data?.followup_count ?? 0,
    pdfUploadCount: data?.pdf_upload_count ?? 0,
    pdfAnalysisCount: data?.pdf_analysis_count ?? 0,
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

  await (supabase as any).rpc('increment_usage_record', {
    p_user_id: userId,
    p_feature: feature,
    p_token_input: opts.tokenInput ?? 0,
    p_token_output: opts.tokenOutput ?? 0,
    p_cost: cost,
    p_storage_mb: opts.storageMb ?? 0,
  })

  // Keep legacy monthly_usage in sync (no legacy column exists for 'followup', so skip it)
  if (feature !== 'followup') {
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
    throw new UsageLimitError(
      `이번 달 사용 한도(${check.limit}회)를 초과했습니다. 플랜을 업그레이드해주세요.`,
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

function getFeatureCounts(
  feature: UsageFeature,
  usage: MonthlyUsageData,
  limits: PlanLimits
): { used: number; limit: number } {
  switch (feature) {
    case 'sms':          return { used: usage.smsCount,         limit: limits.smsLimit }
    case 'script':       return { used: usage.scriptCount,      limit: limits.scriptLimit }
    case 'followup':     return { used: usage.followupCount,    limit: limits.followupLimit }
    case 'pdf_upload':   return { used: usage.pdfUploadCount,   limit: limits.pdfUploadLimit }
    case 'pdf_analysis': return { used: usage.pdfAnalysisCount, limit: limits.pdfAnalysisLimit }
  }
}
