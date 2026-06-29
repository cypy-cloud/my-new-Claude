import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'

export async function GET() {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  // service role 클라이언트 — RLS 우회, 집계만 수행
  const supabase = createAdminClient()
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const monthStr = now.toISOString().slice(0, 7) // YYYY-MM
  const todayStart = `${todayStr}T00:00:00.000Z`
  const monthStart = `${monthStr}-01T00:00:00.000Z`

  // ── 1. 회원 통계 ────────────────────────────────────────────────────────────
  const [
    { count: totalUsers },
    { count: freeUsers },
    { count: paidUsers },
    { count: todaySignups },
    { count: monthSignups },
    { count: activeUsers },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('profiles').select('*', { count: 'exact', head: true }).neq('status', 'deleted'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('profiles').select('*', { count: 'exact', head: true }).eq('plan_type', 'free').neq('status', 'deleted'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('profiles').select('*', { count: 'exact', head: true }).neq('plan_type', 'free').neq('status', 'deleted'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  // ── 2. AI 생성 통계 ─────────────────────────────────────────────────────────
  const [
    { count: todayOutputs },
    { count: monthOutputs },
    { count: smsCount },
    { count: scriptCount },
    { count: pdfExplCount },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('generated_outputs').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('generated_outputs').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('generated_outputs').select('*', { count: 'exact', head: true }).eq('type', 'sms'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('generated_outputs').select('*', { count: 'exact', head: true }).eq('type', 'script'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('generated_outputs').select('*', { count: 'exact', head: true }).eq('type', 'pdf_explanation'),
  ])

  // ── 3. 파일 통계 ────────────────────────────────────────────────────────────
  // 메타데이터만 조회 (extracted_text, storage_path 제외)
  const { data: fileStats } = await (supabase as any)
    .from('uploaded_files')
    .select('file_size_mb, status, delete_after')
    .neq('status', 'deleted')

  const pdfUploadCount = (fileStats ?? []).length
  const totalStorageMb = (fileStats ?? []).reduce((s: number, f: { file_size_mb: number }) => s + (f.file_size_mb ?? 0), 0)
  const pendingDeleteCount = (fileStats ?? []).filter((f: { delete_after: string | null }) =>
    f.delete_after && new Date(f.delete_after) > now
  ).length

  // PDF 분석 횟수는 generated_outputs type=pdf_explanation 기준
  const pdfAnalysisCount = pdfExplCount ?? 0

  // ── 4. 비용 추정 ────────────────────────────────────────────────────────────
  const { data: usageRows } = await (supabase as any)
    .from('usage_records')
    .select('ai_cost_estimate')
    .eq('usage_month', monthStr)

  const aiCostThisMonth = (usageRows ?? []).reduce(
    (s: number, r: { ai_cost_estimate: number }) => s + (r.ai_cost_estimate ?? 0), 0
  )

  // ── 5. 에러 이벤트 수 ────────────────────────────────────────────────────────
  const { count: errorCount } = await (supabase as any)
    .from('event_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', 'error')
    .gte('created_at', monthStart)

  // ── 6. DAU / MAU ────────────────────────────────────────────────────────────
  const { data: dauRows } = await (supabase as any)
    .from('event_logs')
    .select('user_id')
    .gte('created_at', todayStart)
    .not('user_id', 'is', null)

  const { data: mauRows } = await (supabase as any)
    .from('event_logs')
    .select('user_id')
    .gte('created_at', monthStart)
    .not('user_id', 'is', null)

  const dau = new Set((dauRows ?? []).map((r: { user_id: string }) => r.user_id)).size
  const mau = new Set((mauRows ?? []).map((r: { user_id: string }) => r.user_id)).size

  // ── 7. 구독 전환 분석 ────────────────────────────────────────────────────────
  const { count: upgradeClickCount } = await (supabase as any)
    .from('event_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', 'upgrade_click')
    .gte('created_at', monthStart)

  const { count: upgradeCompleteCount } = await (supabase as any)
    .from('subscription_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'upgrade')
    .eq('status', 'completed')
    .gte('created_at', monthStart)

  const conversionRate = (upgradeClickCount ?? 0) > 0
    ? Math.round(((upgradeCompleteCount ?? 0) / (upgradeClickCount ?? 1)) * 100)
    : 0

  // ── 8. 기능별 사용량 (이번 달) ───────────────────────────────────────────────
  const { data: usageAggRows } = await (supabase as any)
    .from('usage_records')
    .select('sms_count, script_count, pdf_upload_count, pdf_analysis_count')
    .eq('usage_month', monthStr)

  const monthSms = (usageAggRows ?? []).reduce((s: number, r: { sms_count: number }) => s + (r.sms_count ?? 0), 0)
  const monthScript = (usageAggRows ?? []).reduce((s: number, r: { script_count: number }) => s + (r.script_count ?? 0), 0)
  const monthPdfUpload = (usageAggRows ?? []).reduce((s: number, r: { pdf_upload_count: number }) => s + (r.pdf_upload_count ?? 0), 0)
  const monthPdfAnalysis = (usageAggRows ?? []).reduce((s: number, r: { pdf_analysis_count: number }) => s + (r.pdf_analysis_count ?? 0), 0)

  // ── 9. 요금제별 분포 ─────────────────────────────────────────────────────────
  const { data: planDist } = await (supabase as any)
    .from('profiles')
    .select('plan_type')
    .neq('status', 'deleted')

  const planCounts: Record<string, number> = { free: 0, basic: 0, pro: 0, premium: 0 }
  for (const p of (planDist ?? [])) {
    planCounts[p.plan_type] = (planCounts[p.plan_type] ?? 0) + 1
  }

  // ── 10. 이탈 위험 사용자 (30일 이상 미접속 + 유료 플랜) ─────────────────────
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentActiveUserIds } = await (supabase as any)
    .from('event_logs')
    .select('user_id')
    .gte('created_at', thirtyDaysAgo)
    .not('user_id', 'is', null)

  const recentActiveSet = new Set((recentActiveUserIds ?? []).map((r: { user_id: string }) => r.user_id))

  const { data: paidProfiles } = await (supabase as any)
    .from('profiles')
    .select('user_id, name, email, plan_type, created_at')
    .neq('plan_type', 'free')
    .eq('status', 'active')
    .limit(200)

  const churnRiskUsers = (paidProfiles ?? [])
    .filter((p: { user_id: string }) => !recentActiveSet.has(p.user_id))
    .slice(0, 10)

  // ── 11. 최근 이벤트 활동 ────────────────────────────────────────────────────
  const { data: recentEvents } = await (supabase as any)
    .from('event_logs')
    .select('event_name, feature_type, page_path, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    users: {
      total: totalUsers ?? 0,
      free: freeUsers ?? 0,
      paid: paidUsers ?? 0,
      todaySignups: todaySignups ?? 0,
      monthSignups: monthSignups ?? 0,
      active: activeUsers ?? 0,
      dau,
      mau,
    },
    outputs: {
      today: todayOutputs ?? 0,
      month: monthOutputs ?? 0,
      sms: smsCount ?? 0,
      script: scriptCount ?? 0,
      pdfExplanation: pdfAnalysisCount,
    },
    files: {
      uploadCount: pdfUploadCount,
      totalStorageMb: Math.round(totalStorageMb * 100) / 100,
      pendingDeleteCount,
      pdfAnalysisCount,
    },
    costs: {
      aiCostUsd: Math.round(aiCostThisMonth * 1000000) / 1000000,
    },
    errors: {
      monthCount: errorCount ?? 0,
    },
    conversion: {
      upgradeClickCount: upgradeClickCount ?? 0,
      upgradeCompleteCount: upgradeCompleteCount ?? 0,
      conversionRate,
    },
    featureUsage: {
      sms: monthSms,
      script: monthScript,
      pdfUpload: monthPdfUpload,
      pdfAnalysis: monthPdfAnalysis,
    },
    planDistribution: planCounts,
    churnRiskUsers: churnRiskUsers.map((p: {
      user_id: string; name: string | null; email: string; plan_type: string; created_at: string
    }) => ({
      userId: p.user_id,
      name: p.name,
      email: p.email,
      planType: p.plan_type,
      joinedAt: p.created_at,
    })),
    recentEvents: (recentEvents ?? []).map((e: {
      event_name: string; feature_type: string | null; page_path: string | null; created_at: string; user_id: string | null
    }) => ({
      eventName: e.event_name,
      featureType: e.feature_type,
      pagePath: e.page_path,
      createdAt: e.created_at,
      userId: e.user_id,
    })),
  })
}
