import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMonthlyUsage } from '@/lib/subscription/usage'
import { getPlanLimits, PLANS, PLAN_LABELS, type PlanId } from '@/lib/subscription/plans'
import { getSubscription } from '@/lib/billing/subscription-service'

const PLAN_ORDER: PlanId[] = ['free', 'basic', 'pro', 'premium']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('plan_type')
    .eq('id', user.id)
    .single()

  const planId = (profile?.plan_type as PlanId) ?? 'free'
  const limits = getPlanLimits(planId)
  const usage = await getMonthlyUsage(user.id)
  const subscription = await getSubscription(user.id)

  // 다음 추천 플랜
  const currentRank = PLAN_ORDER.indexOf(planId)
  const recommendedPlanId = currentRank < PLAN_ORDER.length - 1
    ? PLAN_ORDER[currentRank + 1]
    : null

  // 기능별 사용량 요약
  const features = [
    {
      key: 'sms',
      label: 'AI 문자/카톡',
      used: usage.smsCount,
      limit: limits.smsLimit,
      remaining: Math.max(0, limits.smsLimit - usage.smsCount),
      exceeded: usage.smsCount >= limits.smsLimit,
    },
    {
      key: 'script',
      label: 'AI 상담 스크립트',
      used: usage.scriptCount,
      limit: limits.scriptLimit,
      remaining: Math.max(0, limits.scriptLimit - usage.scriptCount),
      exceeded: usage.scriptCount >= limits.scriptLimit,
    },
    {
      key: 'followup',
      label: '후속 연락',
      used: usage.followupCount,
      limit: limits.followupLimit,
      remaining: Math.max(0, limits.followupLimit - usage.followupCount),
      exceeded: usage.followupCount >= limits.followupLimit,
    },
    {
      key: 'pdf_upload',
      label: 'PDF 업로드',
      used: usage.pdfUploadCount,
      limit: limits.pdfUploadLimit,
      remaining: Math.max(0, limits.pdfUploadLimit - usage.pdfUploadCount),
      exceeded: usage.pdfUploadCount >= limits.pdfUploadLimit,
    },
    {
      key: 'pdf_analysis',
      label: 'PDF 분석',
      used: usage.pdfAnalysisCount,
      limit: limits.pdfAnalysisLimit,
      remaining: Math.max(0, limits.pdfAnalysisLimit - usage.pdfAnalysisCount),
      exceeded: usage.pdfAnalysisCount >= limits.pdfAnalysisLimit,
    },
  ]

  const anyExceeded = features.some(f => f.exceeded)
  const resetDate = (() => {
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return next.toISOString().slice(0, 10)
  })()

  return NextResponse.json({
    planId,
    planLabel: PLAN_LABELS[planId],
    planPrice: PLANS[planId].price,
    features,
    anyExceeded,
    resetDate,
    recommendedPlanId,
    recommendedPlanLabel: recommendedPlanId ? PLAN_LABELS[recommendedPlanId] : null,
    recommendedPlanPrice: recommendedPlanId ? PLANS[recommendedPlanId].price : null,
    subscription: subscription
      ? {
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          currentPeriodEnd: subscription.currentPeriodEnd,
          provider: subscription.provider,
        }
      : null,
  })
}
