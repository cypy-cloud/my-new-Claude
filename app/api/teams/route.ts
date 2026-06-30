import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TEAM_ROLE_LABELS, type TeamRole } from '@/lib/team/types'

// GET: 내 팀 정보 + 내 역할 조회 (소속 팀이 없으면 team: null)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: membership } = await (supabase as any)
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ team: null, myRole: null })
  }

  const { data: team } = await (supabase as any)
    .from('teams')
    .select('id, team_name, organization_name, owner_user_id, created_at')
    .eq('id', membership.team_id)
    .single()

  const admin = createAdminClient()
  const { count: memberCount } = await (admin as any)
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', membership.team_id)

  return NextResponse.json({
    team,
    myRole: membership.role as TeamRole,
    myRoleLabel: TEAM_ROLE_LABELS[membership.role as TeamRole],
    memberCount: memberCount ?? 0,
  })
}

// POST: 새 팀 생성 (이미 소속된 팀이 있으면 생성 불가) — 생성자는 owner가 된다
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const { teamName, organizationName } = body

  if (!teamName || typeof teamName !== 'string' || !teamName.trim()) {
    return NextResponse.json({ error: '팀 이름을 입력해주세요' }, { status: 400 })
  }

  const { data: existing } = await (supabase as any)
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: '이미 소속된 팀이 있습니다' }, { status: 409 })
  }

  const { data: team, error: teamError } = await (supabase as any)
    .from('teams')
    .insert({
      team_name: teamName.trim(),
      organization_name: organizationName?.trim() || null,
      owner_user_id: user.id,
    })
    .select('id, team_name, organization_name, owner_user_id, created_at')
    .single()

  if (teamError || !team) {
    console.error('[teams.create] team insert failed:', teamError)
    return NextResponse.json({ error: '팀 생성 실패', detail: teamError?.message }, { status: 500 })
  }

  const { error: memberError } = await (supabase as any)
    .from('team_members')
    .insert({ team_id: team.id, user_id: user.id, role: 'owner' })

  if (memberError) {
    console.error('[teams.create] member insert failed:', memberError)
    return NextResponse.json({ error: '팀 생성 실패 (멤버 등록)', detail: memberError.message }, { status: 500 })
  }

  await (supabase as any)
    .from('profiles')
    .update({ team_id: team.id })
    .eq('id', user.id)

  return NextResponse.json({ team, myRole: 'owner' })
}
