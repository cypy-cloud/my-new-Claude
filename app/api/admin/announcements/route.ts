import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import { createNotificationForAllUsers } from '@/lib/notifications/create-notification'

// GET: 관리자용 전체 목록 (비활성 포함)
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const supabase = createAdminClient()
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50'), 100)

  const { data, error } = await (supabase as any)
    .from('announcements')
    .select('id, title, content, type, target_plan, target_role, is_pinned, is_active, starts_at, ends_at, created_by, created_at, updated_at')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json({ announcements: data ?? [] })
}

// POST: 공지 작성
export async function POST(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { title, content, type, targetPlan, targetRole, isPinned, isActive, startsAt, endsAt } = body

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: '제목과 내용이 필요합니다' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from('announcements')
    .insert({
      title: title.trim(),
      content: content.trim(),
      type: type ?? 'info',
      target_plan: targetPlan ?? 'all',
      target_role: targetRole ?? 'all',
      is_pinned: isPinned ?? false,
      is_active: isActive ?? true,
      starts_at: startsAt ?? null,
      ends_at: endsAt ?? null,
      created_by: guard.ctx.userId,
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: '작성 실패' }, { status: 500 })

  // 활성 공지사항이면 대상(target_plan/target_role)에 맞는 사용자에게만 앱 내 알림 발송
  // — 공지 자체는 대상 필터링이 있는데 알림은 항상 전체 발송이라, 대상이 아닌
  // 사용자가 알림을 받고 클릭해도 /notices에 아무것도 안 보이는 문제가 있었음 (2026-07-22 발견)
  if (isActive !== false) {
    createNotificationForAllUsers({
      type: 'announcement',
      title: `[공지] ${title.trim()}`,
      message: content.trim().slice(0, 100) + (content.trim().length > 100 ? '...' : ''),
      actionUrl: '/notices',
    }, { plan: targetPlan ?? 'all', role: targetRole ?? 'all' }).catch(() => {})
  }

  return NextResponse.json({ id: data.id })
}

// PATCH: 수정
export async function PATCH(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { id, title, content, type, targetPlan, targetRole, isPinned, isActive, startsAt, endsAt } = body

  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (title !== undefined) updates.title = title.trim()
  if (content !== undefined) updates.content = content.trim()
  if (type !== undefined) updates.type = type
  if (targetPlan !== undefined) updates.target_plan = targetPlan
  if (targetRole !== undefined) updates.target_role = targetRole
  if (isPinned !== undefined) updates.is_pinned = isPinned
  if (isActive !== undefined) updates.is_active = isActive
  if (startsAt !== undefined) updates.starts_at = startsAt
  if (endsAt !== undefined) updates.ends_at = endsAt

  const supabase = createAdminClient()
  const { error } = await (supabase as any)
    .from('announcements')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: '수정 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE: 삭제
export async function DELETE(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await (supabase as any)
    .from('announcements')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
