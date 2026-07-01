import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'

// GET /api/admin/system-settings — admin 이상 조회
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('system_settings')
    .select('setting_key, setting_value, description, updated_at')
    .order('setting_key')

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json({ settings: data ?? [] })
}

// PATCH /api/admin/system-settings — super_admin만
export async function PATCH(request: NextRequest) {
  const guard = await adminGuard('super_admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { key, value } = body as { key: string; value: string }

  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key, value 필수' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await (admin as any)
    .from('system_settings')
    .update({ setting_value: String(value), updated_by: guard.ctx.userId, updated_at: new Date().toISOString() })
    .eq('setting_key', key)

  if (error) return NextResponse.json({ error: '설정 변경 실패' }, { status: 500 })
  return NextResponse.json({ ok: true, key, value })
}
