import { NextRequest, NextResponse } from 'next/server'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const sp = request.nextUrl.searchParams
  const feature_type = sp.get('feature_type')
  const search = sp.get('search')

  let query = (createAdminClient() as any)
    .from('content_templates')
    .select(`
      id, title, description, category, feature_type,
      insurance_company_id, template_content, variables,
      tags, is_public, is_premium, is_active, sort_order,
      created_at, updated_at,
      insurance_companies(name)
    `)

  if (feature_type) query = query.eq('feature_type', feature_type)
  if (search) query = query.ilike('title', `%${search}%`)

  query = query.order('sort_order').order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) {
    console.error('[admin/templates]', error)
    return NextResponse.json({ error: '템플릿 처리 중 문제가 발생했습니다' }, { status: 500 })
  }

  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await request.json()
  const {
    title, description, category, feature_type,
    insurance_company_id, template_content, variables,
    tags, is_public, is_premium, is_active, sort_order
  } = body

  if (!title || !category || !feature_type || !template_content) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요' }, { status: 400 })
  }

  const { data, error } = await (createAdminClient() as any)
    .from('content_templates')
    .insert({
      title, description, category, feature_type,
      insurance_company_id: insurance_company_id || null,
      template_content,
      variables: variables ?? [],
      tags: tags ?? [],
      is_public: is_public ?? true,
      is_premium: is_premium ?? false,
      is_active: is_active ?? true,
      sort_order: sort_order ?? 0,
      created_by: user!.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[admin/templates]', error)
    return NextResponse.json({ error: '템플릿 처리 중 문제가 발생했습니다' }, { status: 500 })
  }
  return NextResponse.json({ template: data }, { status: 201 })
}
