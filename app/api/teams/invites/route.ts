import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { teamAdminGuard, isGuardError } from '@/lib/team/guard'

// GET: 팀의 초대(연결 대기/완료) 목록 조회 (owner/manager 전용)
export async function GET() {
  const guard = await teamAdminGuard()
  if (isGuardError(guard)) return guard

  const admin = createAdminClient()
  const { data: invites, error } = await (admin as any)
    .from('team_invites')
    .select('id, team_id, email, role, status, created_at, connected_at')
    .eq('team_id', guard.ctx.teamId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json({ invites: invites ?? [] })
}
