import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'

const COMPANY_TYPES = ['life', 'non_life', 'ga', 'other']

// GET: 보험사 목록 (admin 이상 조회 가능)
export async function GET() {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from('insurance_companies')
    .select('id, name, company_type, is_active, created_at')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json({ companies: data ?? [] })
}

// POST: 보험사 등록 (super_admin만 가능)
export async function POST(request: NextRequest) {
  const guard = await adminGuard('super_admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { name, companyType } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: '보험사명을 입력해주세요' }, { status: 400 })
  }
  if (companyType && !COMPANY_TYPES.includes(companyType)) {
    return NextResponse.json({ error: '잘못된 보험사 유형입니다' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from('insurance_companies')
    .insert({ name: name.trim(), company_type: companyType || 'other' })
    .select('id, name, company_type, is_active, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 보험사입니다' }, { status: 409 })
    }
    return NextResponse.json({ error: '등록 실패' }, { status: 500 })
  }

  return NextResponse.json({ company: data })
}

// PATCH: 보험사 정보 수정 / 활성 여부 변경 (super_admin만 가능)
export async function PATCH(request: NextRequest) {
  const guard = await adminGuard('super_admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { id, name, companyType, isActive } = body
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof name === 'string' && name.trim()) update.name = name.trim()
  if (companyType) {
    if (!COMPANY_TYPES.includes(companyType)) {
      return NextResponse.json({ error: '잘못된 보험사 유형입니다' }, { status: 400 })
    }
    update.company_type = companyType
  }
  if (typeof isActive === 'boolean') update.is_active = isActive

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '수정할 내용이 없습니다' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await (supabase as any).from('insurance_companies').update(update).eq('id', id)

  if (error) return NextResponse.json({ error: '수정 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
