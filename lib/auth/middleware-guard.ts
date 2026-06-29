import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from './permissions'
import { isAtLeast } from './permissions'

// API Route Handler에서 관리자 권한 확인 후 에러 반환하는 헬퍼
export async function adminGuard(
  minRole: UserRole = 'admin'
): Promise<{ ctx: { userId: string; role: UserRole } } | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles').select('role').eq('user_id', user.id).single()

  const role = (profile?.role as UserRole) ?? 'user'
  if (!isAtLeast(role, minRole)) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
  }

  return { ctx: { userId: user.id, role } }
}

export function isGuardError(result: unknown): result is NextResponse {
  return result instanceof NextResponse
}

// Next.js middleware에서 admin 경로 보호 (middleware.ts에서 호출)
export function isAdminPath(request: NextRequest): boolean {
  return request.nextUrl.pathname.startsWith('/admin')
}
