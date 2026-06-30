import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { teamMemberGuard, isGuardError } from '@/lib/team/guard'

// GET: 팀원 목록 조회 (팀 소속이면 누구나 조회 가능)
// profiles RLS는 본인 행만 노출하므로, 팀 소속을 먼저 확인한 뒤
// admin client로 같은 팀 멤버들의 이름/이메일만 제한적으로 조회한다.
export async function GET() {
  const guard = await teamMemberGuard()
  if (isGuardError(guard)) return guard

  const admin = createAdminClient()

  const { data: rawMembers } = await (admin as any)
    .from('team_members')
    .select('id, team_id, user_id, role, joined_at')
    .eq('team_id', guard.ctx.teamId)
    .order('joined_at', { ascending: true })

  const userIds = (rawMembers ?? []).map((m: any) => m.user_id)
  const { data: profiles } = userIds.length > 0
    ? await (admin as any).from('profiles').select('id, full_name, email').in('id', userIds)
    : { data: [] }

  const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]))
  const members = (rawMembers ?? []).map((m: any) => ({
    id: m.id,
    team_id: m.team_id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    name: profileMap.get(m.user_id)?.full_name ?? null,
    email: profileMap.get(m.user_id)?.email ?? '',
  }))

  return NextResponse.json({ members })
}
