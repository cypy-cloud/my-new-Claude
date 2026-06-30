import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'

// GET: 관리자용 버전 전체 목록
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const supabase = createAdminClient()
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50'), 100)

  const { data, error } = await (supabase as any)
    .from('app_versions')
    .select('id, version, title, description, changes, release_date, is_current, created_by, created_at, updated_at')
    .order('release_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json({ versions: data ?? [] })
}

// POST: 버전 등록
export async function POST(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { version, title, description, changes, releaseDate, isCurrent } = body

  if (!version?.trim() || !title?.trim()) {
    return NextResponse.json({ error: '버전과 제목이 필요합니다' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (isCurrent) {
    await (supabase as any).from('app_versions').update({ is_current: false }).eq('is_current', true)
  }

  const { data, error } = await (supabase as any)
    .from('app_versions')
    .insert({
      version: version.trim(),
      title: title.trim(),
      description: description?.trim() ?? null,
      changes: Array.isArray(changes) ? changes : [],
      release_date: releaseDate ?? new Date().toISOString().slice(0, 10),
      is_current: isCurrent ?? false,
      created_by: guard.ctx.userId,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: '작성 실패' }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

// PATCH: 수정
export async function PATCH(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { id, version, title, description, changes, releaseDate, isCurrent } = body

  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  const supabase = createAdminClient()

  if (isCurrent) {
    await (supabase as any).from('app_versions').update({ is_current: false }).eq('is_current', true).neq('id', id)
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (version !== undefined) updates.version = version.trim()
  if (title !== undefined) updates.title = title.trim()
  if (description !== undefined) updates.description = description?.trim() ?? null
  if (changes !== undefined) updates.changes = Array.isArray(changes) ? changes : []
  if (releaseDate !== undefined) updates.release_date = releaseDate
  if (isCurrent !== undefined) updates.is_current = isCurrent

  const { error } = await (supabase as any)
    .from('app_versions')
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
    .from('app_versions')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
