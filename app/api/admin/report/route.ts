import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'

export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const supabase = createAdminClient()
  const sp = request.nextUrl.searchParams
  const months = parseInt(sp.get('months') ?? '6')

  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).toISOString()

  const FEATURE_LABELS: Record<string, string> = {
    ai_message: 'AI 문자/카톡',
    ai_script: 'AI 상담 스크립트',
    ai_document: 'AI PDF 분석',
    sms_message: 'AI 문자/카톡',
    sales_script: 'AI 상담 스크립트',
    pdf_explanation: 'AI PDF 분석',
  }

  // 1. 전체 사용자 수 및 요금제별 분포
  const { data: profiles } = await (supabase as any)
    .from('profiles')
    .select('plan_type, status, created_at')
    .neq('status', 'deleted')

  const planDist: Record<string, number> = {}
  let totalUsers = 0
  for (const p of profiles ?? []) {
    totalUsers++
    planDist[p.plan_type] = (planDist[p.plan_type] ?? 0) + 1
  }
  const paidUsers = totalUsers - (planDist['free'] ?? 0)
  const conversionRate = totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 100) : 0

  // 월별 신규 가입자
  const userMonthly: Record<string, number> = {}
  for (const p of profiles ?? []) {
    const month = p.created_at?.slice(0, 7)
    if (month && p.created_at >= periodStart) {
      userMonthly[month] = (userMonthly[month] ?? 0) + 1
    }
  }

  // 2. 기능별 사용량 및 AI 비용 추이
  const { data: aiRequests } = await (supabase as any)
    .from('ai_requests')
    .select('feature_type, status, estimated_cost, created_at')
    .gte('created_at', periodStart)

  const featureUsage: Record<string, number> = {}
  const costMonthly: Record<string, number> = {}
  const requestMonthly: Record<string, number> = {}

  for (const r of aiRequests ?? []) {
    if (r.status !== 'success' && r.status !== 'cached') continue
    const label = FEATURE_LABELS[r.feature_type] ?? r.feature_type
    featureUsage[label] = (featureUsage[label] ?? 0) + 1
    const month = r.created_at.slice(0, 7)
    costMonthly[month] = (costMonthly[month] ?? 0) + (r.estimated_cost ?? 0)
    requestMonthly[month] = (requestMonthly[month] ?? 0) + 1
  }

  // 3. 저장공간 추이 (pdf_files)
  const { data: pdfFiles } = await (supabase as any)
    .from('pdf_files')
    .select('file_size, created_at')
    .gte('created_at', periodStart)

  const storageMonthly: Record<string, number> = {}
  for (const f of pdfFiles ?? []) {
    const month = f.created_at?.slice(0, 7)
    if (month) {
      storageMonthly[month] = (storageMonthly[month] ?? 0) + (f.file_size ?? 0)
    }
  }

  // 4. 품질 평가 평균
  const { data: ratings } = await (supabase as any)
    .from('ai_output_ratings')
    .select('rating, feature_type')
    .gte('created_at', periodStart)

  let ratingSum = 0, ratingCount = 0
  const ratingByFeature: Record<string, { sum: number; count: number }> = {}
  for (const r of ratings ?? []) {
    ratingSum += r.rating
    ratingCount++
    const label = FEATURE_LABELS[r.feature_type] ?? r.feature_type
    if (!ratingByFeature[label]) ratingByFeature[label] = { sum: 0, count: 0 }
    ratingByFeature[label].sum += r.rating
    ratingByFeature[label].count++
  }
  const avgRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0
  const ratingByFeatureAvg = Object.entries(ratingByFeature).map(([feature, { sum, count }]) => ({
    feature,
    avg: Math.round((sum / count) * 10) / 10,
    count,
  }))

  // 5. 피드백 유형 분석
  const { data: feedbacks } = await (supabase as any)
    .from('feedback')
    .select('category, status')
    .gte('created_at', periodStart)

  const feedbackDist: Record<string, number> = {}
  for (const f of feedbacks ?? []) {
    feedbackDist[f.category] = (feedbackDist[f.category] ?? 0) + 1
  }

  const FEEDBACK_LABELS: Record<string, string> = {
    bug: '버그 신고',
    feature_request: '기능 요청',
    improvement: '개선 제안',
    billing: '결제 문의',
    other: '기타',
  }

  // 월별 데이터 정렬
  const allMonths = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const monthlyTrend = allMonths.map(month => ({
    month,
    신규가입: userMonthly[month] ?? 0,
    AI생성: requestMonthly[month] ?? 0,
    비용: Math.round((costMonthly[month] ?? 0) * 10) / 10,
    저장공간MB: Math.round(((storageMonthly[month] ?? 0) / 1024 / 1024) * 10) / 10,
  }))

  return NextResponse.json({
    totalUsers,
    paidUsers,
    freeUsers: planDist['free'] ?? 0,
    conversionRate,
    planDist,
    featureUsage: Object.entries(featureUsage)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count),
    monthlyTrend,
    avgRating,
    ratingByFeature: ratingByFeatureAvg,
    feedbackDist: Object.entries(feedbackDist).map(([category, count]) => ({
      category: FEEDBACK_LABELS[category] ?? category,
      count,
    })).sort((a, b) => b.count - a.count),
    totalFeedback: feedbacks?.length ?? 0,
  })
}
