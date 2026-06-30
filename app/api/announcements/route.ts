import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PlanId } from '@/lib/subscription/plans'
import type { UserRole } from '@/lib/auth/permissions'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 비로그인도 'all' 대상 공지 조회 가능
  let userPlan: PlanId = 'free'
  let userRole: UserRole = 'user'

  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('plan_type, role')
      .eq('id', user.id)
      .single()
    userPlan = (profile?.plan_type as PlanId) ?? 'free'
    userRole = (profile?.role as UserRole) ?? 'user'
  }

  const sp = request.nextUrl.searchParams
  const pinnedOnly = sp.get('pinned') === 'true'
  const limit = Math.min(parseInt(sp.get('limit') ?? '20'), 50)
  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('announcements')
    .select('id, title, content, type, target_plan, target_role, is_pinned, is_active, starts_at, ends_at, created_at')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (pinnedOnly) query = query.eq('is_pinned', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })

  // 대상 필터링: 요금제·역할 기반
  const filtered = (data ?? []).filter((a: {
    target_plan: string; target_role: string
  }) => {
    const planOk = a.target_plan === 'all' || a.target_plan === userPlan
    const roleOk = a.target_role === 'all' || a.target_role === userRole
    return planOk && roleOk
  })

  // 읽음 여부 조회
  let readIds = new Set<string>()
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reads } = await (supabase as any)
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', user.id)
      .in('announcement_id', filtered.map((a: { id: string }) => a.id))

    readIds = new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id))
  }

  const result = filtered.map((a: { id: string }) => ({
    ...a,
    isRead: readIds.has(a.id),
  }))

  return NextResponse.json({ announcements: result })
}
