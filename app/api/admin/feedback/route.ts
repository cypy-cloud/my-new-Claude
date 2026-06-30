import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import type { FeedbackCategory, FeedbackPriority, FeedbackStatus } from '@/types'

const CATEGORIES: FeedbackCategory[] = ['bug', 'feature_request', 'improvement', 'billing', 'other']
const STATUSES: FeedbackStatus[] = ['open', 'reviewing', 'planned', 'resolved', 'closed']
const PRIORITIES: FeedbackPriority[] = ['low', 'medium', 'high']

// GET: 전체 피드백 목록 (카테고리/상태 필터 지원)
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const sp = request.nextUrl.searchParams
  const category = sp.get('category')
  const status = sp.get('status')
  const limit = Math.min(parseInt(sp.get('limit') ?? '100'), 200)

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('feedback')
    .select('id, user_id, category, title, content, status, priority, admin_memo, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (category && CATEGORIES.includes(category as FeedbackCategory)) query = query.eq('category', category)
  if (status && STATUSES.includes(status as FeedbackStatus)) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })

  const rows = data ?? []
  const userIds = [...new Set(rows.map((r: { user_id: string }) => r.user_id))]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase as any)
    .from('profiles')
    .select('user_id, name, email')
    .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

  const profileMap = new Map((profiles ?? []).map((p: { user_id: string }) => [p.user_id, p]))
  const result = rows.map((r: { user_id: string }) => ({
    ...r,
    profile: profileMap.get(r.user_id) ?? null,
  }))

  return NextResponse.json({ feedback: result })
}

// PATCH: 상태/우선순위/관리자 메모 변경
export async function PATCH(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { id, status, priority, adminMemo } = body

  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })
  if (status !== undefined && !STATUSES.includes(status)) {
    return NextResponse.json({ error: '잘못된 상태 값입니다' }, { status: 400 })
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: '잘못된 우선순위 값입니다' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status !== undefined) updates.status = status
  if (priority !== undefined) updates.priority = priority
  if (adminMemo !== undefined) updates.admin_memo = adminMemo?.trim() || null

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('feedback')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: '수정 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
