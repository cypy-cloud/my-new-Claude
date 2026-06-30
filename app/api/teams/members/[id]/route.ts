import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { teamAdminGuard, isGuardError } from '@/lib/team/guard'

// PATCH: 팀원 역할 변경 (owner/manager 전용, owner는 변경 불가)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await teamAdminGuard()
  if (isGuardError(guard)) return guard

  const { id } = await params
  const body = await request.json()
  const { role } = body

  if (!['manager', 'member'].includes(role)) {
    return NextResponse.json({ error: '잘못된 역할입니다' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: target } = await (admin as any)
    .from('team_members')
    .select('id, team_id, role')
    .eq('id', id)
    .eq('team_id', guard.ctx.teamId)
    .maybeSingle()

  if (!target) return NextResponse.json({ error: '대상을 찾을 수 없습니다' }, { status: 404 })
  if (target.role === 'owner') return NextResponse.json({ error: '팀 소유자의 역할은 변경할 수 없습니다' }, { status: 400 })

  const { error } = await (admin as any).from('team_members').update({ role }).eq('id', id)
  if (error) return NextResponse.json({ error: '변경 실패' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE: 팀원 제거 (owner/manager 전용, owner는 제거 불가)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await teamAdminGuard()
  if (isGuardError(guard)) return guard

  const { id } = await params
  const admin = createAdminClient()

  const { data: target } = await (admin as any)
    .from('team_members')
    .select('id, team_id, user_id, role')
    .eq('id', id)
    .eq('team_id', guard.ctx.teamId)
    .maybeSingle()

  if (!target) return NextResponse.json({ error: '대상을 찾을 수 없습니다' }, { status: 404 })
  if (target.role === 'owner') return NextResponse.json({ error: '팀 소유자는 제거할 수 없습니다' }, { status: 400 })

  const { error } = await (admin as any).from('team_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: '제거 실패' }, { status: 500 })

  await (admin as any).from('profiles').update({ team_id: null }).eq('user_id', target.user_id)

  return NextResponse.json({ ok: true })
}
