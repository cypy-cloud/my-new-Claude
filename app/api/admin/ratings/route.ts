import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'

// GET /api/admin/ratings
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const admin = createAdminClient()
  const sp = request.nextUrl.searchParams
  const days = parseInt(sp.get('days') ?? '30')
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const [allRes, recentRes] = await Promise.all([
    (admin as any)
      .from('ai_output_ratings')
      .select('rating, is_helpful, feature_type, prompt_version, issue_type')
      .gte('created_at', since),
    (admin as any)
      .from('ai_output_ratings')
      .select('id, user_id, feature_type, rating, is_helpful, feedback_text, issue_type, prompt_version, created_at')
      .gte('created_at', since)
      .not('feedback_text', 'is', null)
      .not('feedback_text', 'eq', '')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const rows: { rating: number; is_helpful: boolean | null; feature_type: string; prompt_version: string | null; issue_type: string | null }[] = allRes.data ?? []
  const totalCount = rows.length
  const avgRating = totalCount > 0 ? rows.reduce((s, r) => s + r.rating, 0) / totalCount : 0
  const helpfulCount = rows.filter(r => r.is_helpful === true).length
  const unhelpfulCount = rows.filter(r => r.is_helpful === false).length

  // 기능별 집계
  const featureMap: Record<string, { count: number; sum: number; helpful: number; unhelpful: number }> = {}
  for (const r of rows) {
    const f = r.feature_type
    if (!featureMap[f]) featureMap[f] = { count: 0, sum: 0, helpful: 0, unhelpful: 0 }
    featureMap[f].count++
    featureMap[f].sum += r.rating
    if (r.is_helpful === true) featureMap[f].helpful++
    if (r.is_helpful === false) featureMap[f].unhelpful++
  }
  const byFeature = Object.entries(featureMap).map(([feature_type, v]) => ({
    feature_type,
    count: v.count,
    avg_rating: v.sum / v.count,
    helpful_count: v.helpful,
    unhelpful_count: v.unhelpful,
  })).sort((a, b) => b.count - a.count)

  // 프롬프트 버전별 집계
  const pvMap: Record<string, { count: number; sum: number }> = {}
  for (const r of rows) {
    const pv = r.prompt_version ?? '(버전 없음)'
    if (!pvMap[pv]) pvMap[pv] = { count: 0, sum: 0 }
    pvMap[pv].count++
    pvMap[pv].sum += r.rating
  }
  const byPromptVersion = Object.entries(pvMap).map(([prompt_version, v]) => ({
    prompt_version,
    count: v.count,
    avg_rating: v.sum / v.count,
  })).sort((a, b) => b.count - a.count)

  // 문제 유형 집계
  const issueCounts: Record<string, number> = {}
  for (const r of rows) {
    if (r.issue_type) issueCounts[r.issue_type] = (issueCounts[r.issue_type] ?? 0) + 1
  }

  return NextResponse.json({
    summary: { totalCount, avgRating, helpfulCount, unhelpfulCount },
    byFeature,
    byPromptVersion,
    issueDistribution: issueCounts,
    recentFeedback: recentRes.data ?? [],
  })
}
