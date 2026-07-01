import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import type { UserRole } from '@/lib/auth/permissions'
import { isAtLeast } from '@/lib/auth/permissions'

// GET /api/admin/users — 회원 검색 + 목록 조회
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const admin = createAdminClient()
  const sp = request.nextUrl.searchParams
  const search = sp.get('search') ?? ''
  const planFilter = sp.get('plan') ?? ''
  const roleFilter = sp.get('role') ?? ''
  const statusFilter = sp.get('status') ?? ''
  const limit = Math.min(parseInt(sp.get('limit') ?? '50'), 100)
  const offset = parseInt(sp.get('offset') ?? '0')

  let query = (admin as any)
    .from('profiles')
    .select('id, full_name, email, plan_type, role, status, created_at, company_name, branch_name', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (planFilter) query = query.eq('plan_type', planFilter)
  if (roleFilter) query = query.eq('role', roleFilter)
  if (statusFilter) query = query.eq('status', statusFilter)
  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,company_name.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: '조회 실패', detail: error.message, code: error.code }, { status: 500 })

  return NextResponse.json({ users: data ?? [], total: count ?? 0 })
}

// PATCH /api/admin/users — 역할/상태 변경
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { targetUserId, role, status } = body as {
    targetUserId: string
    role?: UserRole
    status?: string
  }

  if (!targetUserId) return NextResponse.json({ error: 'targetUserId 필수' }, { status: 400 })

  // 역할 변경은 super_admin만
  if (role !== undefined) {
    const guard = await adminGuard('super_admin')
    if (isGuardError(guard)) return guard

    const VALID_ROLES: UserRole[] = ['user', 'manager', 'admin', 'super_admin']
    if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: '유효하지 않은 역할' }, { status: 400 })
    if (targetUserId === guard.ctx.userId) return NextResponse.json({ error: '자신의 역할은 변경할 수 없습니다' }, { status: 400 })
    if (!isAtLeast(guard.ctx.role, 'super_admin') && role === 'super_admin') {
      return NextResponse.json({ error: 'super_admin 권한은 super_admin만 부여할 수 있습니다' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { error } = await (admin as any)
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
    if (error) return NextResponse.json({ error: '역할 변경 실패' }, { status: 500 })
    return NextResponse.json({ ok: true, role, changedBy: guard.ctx.userId })
  }

  // 상태 변경은 admin 이상
  if (status !== undefined) {
    const guard = await adminGuard('admin')
    if (isGuardError(guard)) return guard

    const VALID_STATUSES = ['active', 'suspended', 'deleted']
    if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: '유효하지 않은 상태' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await (admin as any)
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
    if (error) return NextResponse.json({ error: '상태 변경 실패' }, { status: 500 })
    return NextResponse.json({ ok: true, status, changedBy: guard.ctx.userId })
  }

  return NextResponse.json({ error: 'role 또는 status 중 하나 필수' }, { status: 400 })
}
