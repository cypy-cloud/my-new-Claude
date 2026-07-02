import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: profile } = await (createAdminClient() as any)
    .from('profiles')
    .select('plan_type')
    .eq('id', user.id)
    .single()

  const isPremium = ['pro', 'premium', 'team'].includes(profile?.plan_type ?? '')

  const sp = request.nextUrl.searchParams
  const feature_type = sp.get('feature_type') // ai_message | ai_script | ai_document
  const category = sp.get('category')
  const search = sp.get('search')
  const insurance_company_id = sp.get('insurance_company_id')

  let query = (createAdminClient() as any)
    .from('content_templates')
    .select(`
      id, title, description, category, feature_type,
      insurance_company_id, template_content, variables,
      tags, is_premium, sort_order, created_at,
      insurance_companies(name)
    `)
    .eq('is_public', true)
    .eq('is_active', true)

  if (!isPremium) query = query.eq('is_premium', false)
  if (feature_type) query = query.eq('feature_type', feature_type)
  if (category) query = query.eq('category', category)
  if (insurance_company_id) query = query.eq('insurance_company_id', insurance_company_id)
  if (search) query = query.ilike('title', `%${search}%`)

  query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ templates: data ?? [], isPremium })
}
