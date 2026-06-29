import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export type UserRole = 'user' | 'manager' | 'admin' | 'super_admin'

export type PermissionKey =
  | 'team.view_members'
  | 'team.view_usage'
  | 'users.list'
  | 'users.view'
  | 'users.change_plan'
  | 'users.change_role'
  | 'usage.view_stats'
  | 'notice.write'
  | 'feedback.view'
  | 'logs.view_errors'
  | 'logs.view_all'
  | 'system.settings'
  | 'ai.prompt_manage'

// 정적 fallback 권한 맵 (DB 조회 없이도 동작)
const STATIC_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  user: [],
  manager: ['team.view_members', 'team.view_usage'],
  admin: [
    'team.view_members', 'team.view_usage',
    'users.list', 'users.view', 'users.change_plan',
    'usage.view_stats', 'notice.write', 'feedback.view', 'logs.view_errors',
  ],
  super_admin: [
    'team.view_members', 'team.view_usage',
    'users.list', 'users.view', 'users.change_plan', 'users.change_role',
    'usage.view_stats', 'notice.write', 'feedback.view',
    'logs.view_errors', 'logs.view_all',
    'system.settings', 'ai.prompt_manage',
  ],
}

const ROLE_RANK: Record<UserRole, number> = { user: 0, manager: 1, admin: 2, super_admin: 3 }

export function getRoleRank(role: UserRole): number {
  return ROLE_RANK[role] ?? 0
}

export function isAtLeast(role: UserRole, minRole: UserRole): boolean {
  return getRoleRank(role) >= getRoleRank(minRole)
}

export function hasPermission(role: UserRole, key: PermissionKey): boolean {
  return STATIC_PERMISSIONS[role]?.includes(key) ?? false
}

export interface AuthContext {
  userId: string
  role: UserRole
  email: string
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (adminClient as any)
    .from('profiles')
    .select('role, email')
    .eq('user_id', user.id)
    .single()

  return {
    userId: user.id,
    role: (profile?.role as UserRole) ?? 'user',
    email: profile?.email ?? user.email ?? '',
  }
}

// 서버 컴포넌트 / Route Handler에서 사용
export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx || !isAtLeast(ctx.role, 'admin')) {
    redirect('/dashboard')
  }
  return ctx
}

export async function requireSuperAdmin(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx || !isAtLeast(ctx.role, 'super_admin')) {
    redirect('/dashboard')
  }
  return ctx
}

export async function requirePermission(key: PermissionKey): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx || !hasPermission(ctx.role, key)) {
    redirect('/dashboard')
  }
  return ctx
}

export async function canAccessAdminPage(): Promise<boolean> {
  const ctx = await getAuthContext()
  if (!ctx) return false
  return isAtLeast(ctx.role, 'admin')
}

// Route Handler에서 사용 (redirect 대신 에러 반환)
export async function getAdminContextOrNull(minRole: UserRole = 'admin'): Promise<AuthContext | null> {
  const ctx = await getAuthContext()
  if (!ctx || !isAtLeast(ctx.role, minRole)) return null
  return ctx
}
