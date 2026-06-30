import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import type { UserRole } from '@/lib/auth/permissions'
import { isAtLeast } from '@/lib/auth/permissions'

// GET /api/admin/users — 회원 목록 조회 (admin+)
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const supabase = await createClient()
  const sp = request.nextUrl.searchParams
  const search = sp.get('search') ?? ''
  const planFilter = sp.get('plan') ?? ''
  const roleFilter = sp.get('role') ?? ''
  const limit = Math.min(parseInt(sp.get('limit') ?? '50'), 100)

  let query = (supabase as any)
    .from('profiles')
    .select('user_id, name, email, plan_type, role, status, created_at, company_name')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (planFilter) query = query.eq('plan_type', planFilter)
  if (roleFilter) query = query.eq('role', roleFilter)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })

  let results = data ?? []
  if (search) {
    const q = search.toLowerCase()
    results = results.filter((u: { name?: string; email: string; company_name?: string }) =>
      u.email.toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.company_name ?? '').toLowerCase().includes(q)
    )
  }

  return NextResponse.json({ users: results })
}

// PATCH /api/admin/users — 역할 변경 (super_admin 전용)
export async function PATCH(request: NextRequest) {
  const guard = await adminGuard('super_admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { targetUserId, role } = body as { targetUserId: string; role: UserRole }

  const VALID_ROLES: UserRole[] = ['user', 'manager', 'admin', 'super_admin']
  if (!targetUserId || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: '유효하지 않은 요청입니다' }, { status: 400 })
  }

  // super_admin 자기 자신 역할 변경 방지
  if (targetUserId === guard.ctx.userId) {
    return NextResponse.json({ error: '자신의 역할은 변경할 수 없습니다' }, { status: 400 })
  }

  // super_admin → super_admin 이상 부여는 본인만 가능 (이미 super_admin 이어야 함)
  if (!isAtLeast(guard.ctx.role, 'super_admin') && role === 'super_admin') {
    return NextResponse.json({ error: 'super_admin 권한은 super_admin만 부여할 수 있습니다' }, { status: 403 })
  }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (error) return NextResponse.json({ error: '역할 변경 실패' }, { status: 500 })

  return NextResponse.json({ ok: true, role, changedBy: guard.ctx.userId })
}
