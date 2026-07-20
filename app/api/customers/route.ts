import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errors/api-error-handler'

const CUSTOMER_COLUMNS =
  'id, name, phone, age_group, gender, job, relationship_type, family_status, children_status, income_level, interest_products, memo, tags, status, contact_type, created_at, updated_at'

const STATUSES = ['prospect', 'active', 'dormant', 'contracted', 'lost']
const CONTACT_TYPES = ['customer', 'recruit']

// GET /api/customers?q=&tag=&status= — list current user's customers with optional search/filter
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')?.trim()
  const tag = request.nextUrl.searchParams.get('tag')?.trim()
  const status = request.nextUrl.searchParams.get('status')?.trim()
  const contactType = request.nextUrl.searchParams.get('contactType')?.trim()

  let query = (supabase as any)
    .from('customers')
    .select(CUSTOMER_COLUMNS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,memo.ilike.%${q}%`)
  if (tag) query = query.contains('tags', [tag])
  if (status && STATUSES.includes(status)) query = query.eq('status', status)
  if (contactType && CONTACT_TYPES.includes(contactType)) query = query.eq('contact_type', contactType)

  const { data, error } = await query
  if (error) return handleApiError(error, { userId: user.id, area: 'database', metadata: { feature: 'customers_list' } })

  return NextResponse.json({ customers: data ?? [] })
}

// POST /api/customers — create a new customer
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const {
    name, phone, ageGroup, gender, job, relationshipType,
    familyStatus, childrenStatus, incomeLevel, interestProducts,
    memo, tags, status, contactType,
  } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: '고객 이름을 입력해주세요' }, { status: 400 })
  }
  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: '올바르지 않은 상태값입니다' }, { status: 400 })
  }
  if (contactType && !CONTACT_TYPES.includes(contactType)) {
    return NextResponse.json({ error: '올바르지 않은 구분값입니다' }, { status: 400 })
  }

  const { data, error } = await (supabase as any)
    .from('customers')
    .insert({
      user_id: user.id,
      name: name.trim(),
      phone: phone?.trim() || null,
      age_group: ageGroup || null,
      gender: gender || null,
      job: job || null,
      relationship_type: relationshipType || null,
      family_status: familyStatus || null,
      children_status: childrenStatus || null,
      income_level: incomeLevel || null,
      interest_products: Array.isArray(interestProducts) ? interestProducts : [],
      memo: memo?.trim() || null,
      tags: Array.isArray(tags) ? tags : [],
      status: status || 'prospect',
      contact_type: contactType || 'customer',
    })
    .select(CUSTOMER_COLUMNS)
    .single()

  if (error) return handleApiError(error, { userId: user.id, area: 'database', metadata: { feature: 'customers_create' } })

  return NextResponse.json({ customer: data })
}
