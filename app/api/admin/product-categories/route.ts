import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'

// GET: 전체 카테고리 목록 (admin 이상 조회 가능)
export async function GET() {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from('product_categories')
    .select('id, name, parent_id, description, risk_notice, is_active, created_at')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json({ categories: data ?? [] })
}

// POST: 카테고리 등록 (super_admin만 가능)
export async function POST(request: NextRequest) {
  const guard = await adminGuard('super_admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { name, parentId, description, riskNotice } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: '카테고리명을 입력해주세요' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from('product_categories')
    .insert({
      name: name.trim(),
      parent_id: parentId || null,
      description: description?.trim() || null,
      risk_notice: riskNotice?.trim() || null,
    })
    .select('id, name, parent_id, description, risk_notice, is_active, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 카테고리입니다' }, { status: 409 })
    }
    return NextResponse.json({ error: '등록 실패' }, { status: 500 })
  }

  return NextResponse.json({ category: data })
}

// PATCH: 카테고리 수정 / 활성 여부 변경 (super_admin만 가능)
export async function PATCH(request: NextRequest) {
  const guard = await adminGuard('super_admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { id, name, parentId, description, riskNotice, isActive } = body
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof name === 'string' && name.trim()) update.name = name.trim()
  if (parentId !== undefined) update.parent_id = parentId || null
  if (description !== undefined) update.description = description?.trim() || null
  if (riskNotice !== undefined) update.risk_notice = riskNotice?.trim() || null
  if (typeof isActive === 'boolean') update.is_active = isActive

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '수정할 내용이 없습니다' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await (supabase as any).from('product_categories').update(update).eq('id', id)

  if (error) return NextResponse.json({ error: '수정 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
