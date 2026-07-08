import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { teamAdminGuard, isGuardError } from '@/lib/team/guard'

// GET: 팀 전체 사용량 조회 (owner/manager 전용) — 이번 달 멤버별 + 합계
export async function GET() {
  const guard = await teamAdminGuard()
  if (isGuardError(guard)) return guard

  const admin = createAdminClient()
  const month = new Date().toISOString().slice(0, 7)

  const { data: members } = await (admin as any)
    .from('team_members')
    .select('user_id, role')
    .eq('team_id', guard.ctx.teamId)

  const userIds = (members ?? []).map((m: any) => m.user_id)
  if (userIds.length === 0) return NextResponse.json({ month, members: [], totals: emptyTotals() })

  const [{ data: profiles }, { data: usageRows }] = await Promise.all([
    (admin as any).from('profiles').select('id, full_name, email').in('id', userIds),
    (admin as any)
      .from('usage_records')
      .select('user_id, sms_count, script_count, pdf_upload_count, pdf_analysis_count, ai_cost_estimate')
      .eq('usage_month', month)
      .in('user_id', userIds),
  ])

  const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]))
  const usageMap = new Map<string, any>((usageRows ?? []).map((u: any) => [u.user_id, u]))
  const roleMap = new Map<string, any>((members ?? []).map((m: any) => [m.user_id, m.role]))

  const memberUsage = userIds.map((userId: string) => {
    const u = usageMap.get(userId)
    return {
      userId,
      name: profileMap.get(userId)?.full_name ?? null,
      email: profileMap.get(userId)?.email ?? '',
      role: roleMap.get(userId),
      smsCount: u?.sms_count ?? 0,
      scriptCount: u?.script_count ?? 0,
      pdfUploadCount: u?.pdf_upload_count ?? 0,
      pdfAnalysisCount: u?.pdf_analysis_count ?? 0,
      costEstimate: u?.ai_cost_estimate ?? 0,
    }
  })

  const totals = memberUsage.reduce((acc: any, m: any) => ({
    smsCount: acc.smsCount + m.smsCount,
    scriptCount: acc.scriptCount + m.scriptCount,
    pdfUploadCount: acc.pdfUploadCount + m.pdfUploadCount,
    pdfAnalysisCount: acc.pdfAnalysisCount + m.pdfAnalysisCount,
    costEstimate: acc.costEstimate + m.costEstimate,
  }), emptyTotals())

  return NextResponse.json({ month, members: memberUsage, totals })
}

function emptyTotals() {
  return { smsCount: 0, scriptCount: 0, pdfUploadCount: 0, pdfAnalysisCount: 0, costEstimate: 0 }
}
