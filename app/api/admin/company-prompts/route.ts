import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import type { AiCoreFeature } from '@/lib/ai-core/types'

const FEATURE_TYPES: AiCoreFeature[] = [
  'sms_message', 'sales_script', 'pdf_explanation',
  'newsletter', 'blog_content', 'crm_followup', 'objection_handling', 'product_summary',
]

// GET: 보험사별 프롬프트 프로필 목록 (admin 이상 조회 가능, companyId로 필터 가능)
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const sp = request.nextUrl.searchParams
  const companyId = sp.get('companyId')

  const supabase = createAdminClient()
  let query = (supabase as any)
    .from('company_prompt_profiles')
    .select('id, company_id, feature_type, tone_guide, compliance_guide, forbidden_expressions, preferred_expressions, disclaimer_template, is_active, created_at, updated_at')
    .order('feature_type', { ascending: true })
    .order('created_at', { ascending: false })

  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })

  return NextResponse.json({ profiles: data ?? [] })
}

// POST: 새 프로필 생성 (super_admin만 가능)
export async function POST(request: NextRequest) {
  const guard = await adminGuard('super_admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const {
    companyId, featureType, toneGuide, complianceGuide,
    forbiddenExpressions, preferredExpressions, disclaimerTemplate, activate,
  } = body

  if (!companyId) return NextResponse.json({ error: '보험사를 선택해주세요' }, { status: 400 })
  if (!featureType || !FEATURE_TYPES.includes(featureType)) {
    return NextResponse.json({ error: '잘못된 기능 유형입니다' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 새 프로필을 즉시 활성화하려면, 같은 (보험사, 기능)의 기존 활성 프로필을 먼저 비활성화한다
  if (activate) {
    await (supabase as any)
      .from('company_prompt_profiles')
      .update({ is_active: false })
      .eq('company_id', companyId)
      .eq('feature_type', featureType)
      .eq('is_active', true)
  }

  const { data, error } = await (supabase as any)
    .from('company_prompt_profiles')
    .insert({
      company_id: companyId,
      feature_type: featureType,
      tone_guide: toneGuide?.trim() || null,
      compliance_guide: complianceGuide?.trim() || null,
      forbidden_expressions: Array.isArray(forbiddenExpressions) ? forbiddenExpressions : [],
      preferred_expressions: Array.isArray(preferredExpressions) ? preferredExpressions : [],
      disclaimer_template: disclaimerTemplate?.trim() || null,
      is_active: !!activate,
    })
    .select('id, company_id, feature_type, tone_guide, compliance_guide, forbidden_expressions, preferred_expressions, disclaimer_template, is_active, created_at, updated_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 활성화된 프로필이 존재합니다' }, { status: 409 })
    }
    return NextResponse.json({ error: '생성 실패' }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}

// PATCH: 프로필 활성화 (super_admin만 가능) — 같은 (보험사, 기능)의 다른 프로필은 자동 비활성화
export async function PATCH(request: NextRequest) {
  const guard = await adminGuard('super_admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: target } = await (supabase as any)
    .from('company_prompt_profiles')
    .select('id, company_id, feature_type')
    .eq('id', id)
    .single()

  if (!target) return NextResponse.json({ error: '대상을 찾을 수 없습니다' }, { status: 404 })

  await (supabase as any)
    .from('company_prompt_profiles')
    .update({ is_active: false })
    .eq('company_id', target.company_id)
    .eq('feature_type', target.feature_type)

  const { error } = await (supabase as any)
    .from('company_prompt_profiles')
    .update({ is_active: true })
    .eq('id', id)

  if (error) return NextResponse.json({ error: '활성화 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
