import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errors/api-error-handler'

const CUSTOMER_COLUMNS =
  'id, name, phone, age_group, gender, job, relationship_type, family_status, children_status, income_level, interest_products, memo, tags, status, contact_type, created_at, updated_at'

const STATUSES = ['prospect', 'active', 'dormant', 'contracted', 'lost']
const CONTACT_TYPES = ['customer', 'recruit']

// GET /api/customers/[id] — single customer detail
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('customers')
    .select(CUSTOMER_COLUMNS)
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return handleApiError(error, { userId: user.id, area: 'database', metadata: { feature: 'customers_detail' } })
  if (!data) return NextResponse.json({ error: '고객 정보를 찾을 수 없습니다' }, { status: 404 })

  return NextResponse.json({ customer: data })
}

// PATCH /api/customers/[id] — update a customer
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const {
    name, phone, ageGroup, gender, job, relationshipType,
    familyStatus, childrenStatus, incomeLevel, interestProducts,
    memo, tags, status, contactType,
  } = body

  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: '올바르지 않은 상태값입니다' }, { status: 400 })
  }
  if (contactType && !CONTACT_TYPES.includes(contactType)) {
    return NextResponse.json({ error: '올바르지 않은 구분값입니다' }, { status: 400 })
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof name === 'string') {
    if (!name.trim()) return NextResponse.json({ error: '고객 이름을 입력해주세요' }, { status: 400 })
    update.name = name.trim()
  }
  if (phone !== undefined) update.phone = phone?.trim() || null
  if (ageGroup !== undefined) update.age_group = ageGroup || null
  if (gender !== undefined) update.gender = gender || null
  if (job !== undefined) update.job = job || null
  if (relationshipType !== undefined) update.relationship_type = relationshipType || null
  if (familyStatus !== undefined) update.family_status = familyStatus || null
  if (childrenStatus !== undefined) update.children_status = childrenStatus || null
  if (incomeLevel !== undefined) update.income_level = incomeLevel || null
  if (interestProducts !== undefined) update.interest_products = Array.isArray(interestProducts) ? interestProducts : []
  if (memo !== undefined) update.memo = memo?.trim() || null
  if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : []
  if (status !== undefined) update.status = status
  if (contactType !== undefined) update.contact_type = contactType

  const { data, error } = await (supabase as any)
    .from('customers')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(CUSTOMER_COLUMNS)
    .maybeSingle()

  if (error) return handleApiError(error, { userId: user.id, area: 'database', metadata: { feature: 'customers_update' } })
  if (!data) return NextResponse.json({ error: '고객 정보를 찾을 수 없습니다' }, { status: 404 })

  return NextResponse.json({ customer: data })
}

// DELETE /api/customers/[id] — delete a customer
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { error } = await (supabase as any)
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return handleApiError(error, { userId: user.id, area: 'database', metadata: { feature: 'customers_delete' } })

  return NextResponse.json({ ok: true })
}
