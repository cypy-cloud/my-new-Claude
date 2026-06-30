import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { teamAdminGuard, isGuardError } from '@/lib/team/guard'

// POST: 팀원 수동 연결 (owner/manager 전용)
// MVP에서는 실제 이메일 초대 발송 없이, 이미 가입된 사용자의 이메일을 입력하면
// 즉시 팀에 연결한다. 가입되지 않은 이메일이면 team_invites에 pending으로 기록만 한다.
export async function POST(request: NextRequest) {
  const guard = await teamAdminGuard()
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { email, role = 'member' } = body

  if (!email || typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: '이메일을 입력해주세요' }, { status: 400 })
  }
  if (!['manager', 'member'].includes(role)) {
    return NextResponse.json({ error: '잘못된 역할입니다' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const admin = createAdminClient()

  const { data: profile } = await (admin as any)
    .from('profiles')
    .select('user_id, team_id')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  // 아직 가입하지 않은 사용자 → 초대 기록만 남긴다 (placeholder)
  if (!profile) {
    const { data: invite, error: inviteError } = await (admin as any)
      .from('team_invites')
      .upsert(
        { team_id: guard.ctx.teamId, email: normalizedEmail, role, status: 'pending', invited_by: guard.ctx.userId },
        { onConflict: 'team_id,email' }
      )
      .select('id, team_id, email, role, status, created_at, connected_at')
      .single()

    if (inviteError) return NextResponse.json({ error: '초대 등록 실패' }, { status: 500 })
    return NextResponse.json({ connected: false, invite })
  }

  if (profile.team_id) {
    return NextResponse.json({ error: '이미 다른 팀에 소속된 사용자입니다' }, { status: 409 })
  }

  const { error: memberError } = await (admin as any)
    .from('team_members')
    .insert({ team_id: guard.ctx.teamId, user_id: profile.user_id, role })

  if (memberError) {
    if (memberError.code === '23505') {
      return NextResponse.json({ error: '이미 팀에 소속된 사용자입니다' }, { status: 409 })
    }
    return NextResponse.json({ error: '연결 실패' }, { status: 500 })
  }

  await (admin as any).from('profiles').update({ team_id: guard.ctx.teamId }).eq('user_id', profile.user_id)

  await (admin as any)
    .from('team_invites')
    .upsert(
      { team_id: guard.ctx.teamId, email: normalizedEmail, role, status: 'connected', invited_by: guard.ctx.userId, connected_user_id: profile.user_id, connected_at: new Date().toISOString() },
      { onConflict: 'team_id,email' }
    )

  return NextResponse.json({ connected: true })
}
