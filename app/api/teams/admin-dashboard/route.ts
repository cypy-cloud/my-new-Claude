import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { teamAdminGuard, isGuardError } from '@/lib/team/guard'

const FEATURE_LABELS: Record<string, string> = {
  ai_message: 'AI 문자/카톡',
  ai_script: 'AI 상담 스크립트',
  ai_document: 'AI PDF 분석',
}

// GET: 팀 관리자 대시보드 통계
// - 원본 내용(PDF 텍스트, 고객 정보) 없이 집계/카운트만 반환
export async function GET() {
  const guard = await teamAdminGuard()
  if (isGuardError(guard)) return guard

  const admin = createAdminClient()
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)

  // 최근 6개월 목록 (YYYY-MM)
  const recentMonths: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    recentMonths.push(d.toISOString().slice(0, 7))
  }

  // 팀원 목록
  const { data: members } = await (admin as any)
    .from('team_members')
    .select('user_id, role, joined_at')
    .eq('team_id', guard.ctx.teamId)

  const userIds: string[] = (members ?? []).map((m: any) => m.user_id)
  const memberCount = userIds.length

  if (memberCount === 0) {
    return NextResponse.json({ memberCount: 0, currentMonth, monthlyStats: [], trendData: [], recentActivity: [], leastActiveMembers: [] })
  }

  // 프로필 조회
  const { data: profiles } = await (admin as any)
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds)
  const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]))
  const roleMap = new Map((members ?? []).map((m: any) => [m.user_id, m.role]))
  const joinedMap = new Map((members ?? []).map((m: any) => [m.user_id, m.joined_at]))

  // 6개월 usage_records
  const { data: usageRows } = await (admin as any)
    .from('usage_records')
    .select('user_id, usage_month, sms_count, script_count, pdf_upload_count, pdf_analysis_count, ai_cost_estimate')
    .in('user_id', userIds)
    .in('usage_month', recentMonths)

  // 월별 팀 합계 (추이 데이터)
  const trendMap = new Map<string, { sms: number; script: number; pdf: number; cost: number }>()
  for (const m of recentMonths) {
    trendMap.set(m, { sms: 0, script: 0, pdf: 0, cost: 0 })
  }
  for (const row of (usageRows ?? [])) {
    const t = trendMap.get(row.usage_month)
    if (t) {
      t.sms    += row.sms_count ?? 0
      t.script += row.script_count ?? 0
      t.pdf    += (row.pdf_analysis_count ?? 0)
      t.cost   += row.ai_cost_estimate ?? 0
    }
  }
  const trendData = recentMonths.map(m => {
    const t = trendMap.get(m)!
    return { month: m, total: t.sms + t.script + t.pdf, sms: t.sms, script: t.script, pdf: t.pdf, cost: t.cost }
  })

  // 이번 달 멤버별 통계
  const currentUsageMap = new Map<string, any>()
  for (const row of (usageRows ?? [])) {
    if (row.usage_month === currentMonth) currentUsageMap.set(row.user_id, row)
  }

  const monthlyStats = userIds.map((uid: string) => {
    const u = currentUsageMap.get(uid)
    const p = profileMap.get(uid)
    return {
      userId: uid,
      name: p?.full_name ?? null,
      email: p?.email ?? '',
      role: roleMap.get(uid) ?? 'member',
      joinedAt: joinedMap.get(uid) ?? null,
      smsCount:     u?.sms_count ?? 0,
      scriptCount:  u?.script_count ?? 0,
      pdfCount:     u?.pdf_analysis_count ?? 0,
      total:        (u?.sms_count ?? 0) + (u?.script_count ?? 0) + (u?.pdf_analysis_count ?? 0),
      costEstimate: u?.ai_cost_estimate ?? 0,
    }
  }).sort((a: any, b: any) => b.total - a.total)

  // 합계
  const totals = monthlyStats.reduce(
    (acc: any, m: any) => ({
      sms: acc.sms + m.smsCount,
      script: acc.script + m.scriptCount,
      pdf: acc.pdf + m.pdfCount,
      total: acc.total + m.total,
      cost: acc.cost + m.costEstimate,
    }),
    { sms: 0, script: 0, pdf: 0, total: 0, cost: 0 }
  )

  // 가장 많이 쓰는 기능
  const featureCounts = [
    { key: 'ai_message', count: totals.sms },
    { key: 'ai_script', count: totals.script },
    { key: 'ai_document', count: totals.pdf },
  ]
  featureCounts.sort((a, b) => b.count - a.count)
  const topFeature = featureCounts[0].count > 0
    ? { key: featureCounts[0].key, label: FEATURE_LABELS[featureCounts[0].key], count: featureCounts[0].count }
    : null

  // 활동 미흡 팀원 (이번 달 총 사용 = 0)
  const leastActiveMembers = monthlyStats
    .filter((m: any) => m.total === 0)
    .map((m: any) => ({ userId: m.userId, name: m.name, email: m.email, role: m.role }))

  // 최근 활동 로그 (ai_requests) — feature_type, status, created_at 만 반환 (내용 없음)
  const { data: recentRequests } = await (admin as any)
    .from('ai_requests')
    .select('user_id, feature_type, status, created_at')
    .in('user_id', userIds)
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(30)

  const recentActivity = (recentRequests ?? []).map((r: any) => ({
    userId: r.user_id,
    name: profileMap.get(r.user_id)?.full_name ?? null,
    featureType: r.feature_type,
    featureLabel: FEATURE_LABELS[r.feature_type] ?? r.feature_type,
    createdAt: r.created_at,
  }))

  return NextResponse.json({
    memberCount,
    currentMonth,
    totals,
    topFeature,
    monthlyStats,
    trendData,
    leastActiveMembers,
    recentActivity,
  })
}
