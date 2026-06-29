import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import type { UserRole, PermissionKey } from '@/lib/auth/permissions'

// GET /api/admin/permissions — 권한 테이블 조회
export async function GET() {
  const guard = await adminGuard('super_admin')
  if (isGuardError(guard)) return guard

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('admin_permissions')
    .select('*')
    .order('role').order('permission_key')

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json({ permissions: data ?? [] })
}

// PATCH /api/admin/permissions — 특정 권한 토글 (super_admin 전용)
export async function PATCH(request: NextRequest) {
  const guard = await adminGuard('super_admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { role, permissionKey, enabled } = body as {
    role: UserRole; permissionKey: PermissionKey; enabled: boolean
  }

  if (!role || !permissionKey || enabled === undefined) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('admin_permissions')
    .upsert({ role, permission_key: permissionKey, enabled }, { onConflict: 'role,permission_key' })

  if (error) return NextResponse.json({ error: '업데이트 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
