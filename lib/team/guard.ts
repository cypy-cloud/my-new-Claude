import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TeamRole } from './types'

interface TeamGuardCtx {
  userId: string
  teamId: string
  role: TeamRole
}

// API Route Handler에서 "팀 소속 + 최소 권한(owner/manager)" 확인 후 에러 반환하는 헬퍼
export async function teamAdminGuard(): Promise<{ ctx: TeamGuardCtx } | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: membership } = await (supabase as any)
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'manager'])
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: '팀 관리 권한이 없습니다' }, { status: 403 })
  }

  return { ctx: { userId: user.id, teamId: membership.team_id, role: membership.role as TeamRole } }
}

// 단순히 "팀에 소속되어 있는지"만 확인 (조회용, member도 통과)
export async function teamMemberGuard(): Promise<{ ctx: { userId: string; teamId: string; role: TeamRole } } | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: membership } = await (supabase as any)
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: '소속된 팀이 없습니다' }, { status: 404 })
  }

  return { ctx: { userId: user.id, teamId: membership.team_id, role: membership.role as TeamRole } }
}

export function isGuardError(result: unknown): result is NextResponse {
  return result instanceof NextResponse
}
