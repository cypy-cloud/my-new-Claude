import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import type { PromptFeatureType } from '@/types'

const FEATURE_TYPES: PromptFeatureType[] = ['sms', 'script', 'pdf_explanation']

// GET: 전체 프롬프트 버전 목록 (admin 이상 조회 가능)
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const sp = request.nextUrl.searchParams
  const featureType = sp.get('featureType')

  const supabase = createAdminClient()
  let query = (supabase as any)
    .from('prompt_versions')
    .select('id, feature_type, version, title, system_prompt, user_prompt_template, is_active, created_by, created_at, updated_at')
    .order('feature_type', { ascending: true })
    .order('created_at', { ascending: false })

  if (featureType && FEATURE_TYPES.includes(featureType as PromptFeatureType)) {
    query = query.eq('feature_type', featureType)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })

  return NextResponse.json({ prompts: data ?? [] })
}

// POST: 새 버전 생성 (super_admin만 가능)
export async function POST(request: NextRequest) {
  const guard = await adminGuard('super_admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { featureType, version, title, systemPrompt, userPromptTemplate, activate } = body

  if (!featureType || !FEATURE_TYPES.includes(featureType)) {
    return NextResponse.json({ error: '잘못된 기능 유형입니다' }, { status: 400 })
  }
  if (!version || typeof version !== 'string') {
    return NextResponse.json({ error: '버전을 입력해주세요' }, { status: 400 })
  }
  if (!userPromptTemplate || typeof userPromptTemplate !== 'string') {
    return NextResponse.json({ error: '프롬프트 본문을 입력해주세요' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 새 버전을 즉시 활성화하려면, 같은 기능의 기존 활성 버전을 먼저 비활성화한다
  if (activate) {
    await (supabase as any)
      .from('prompt_versions')
      .update({ is_active: false })
      .eq('feature_type', featureType)
      .eq('is_active', true)
  }

  const { data, error } = await (supabase as any)
    .from('prompt_versions')
    .insert({
      feature_type: featureType,
      version,
      title: title?.trim() || null,
      system_prompt: systemPrompt?.trim() || null,
      user_prompt_template: userPromptTemplate,
      is_active: !!activate,
      created_by: guard.ctx.userId,
    })
    .select('id, feature_type, version, title, system_prompt, user_prompt_template, is_active, created_by, created_at, updated_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 동일한 버전이 존재합니다' }, { status: 409 })
    }
    return NextResponse.json({ error: '생성 실패' }, { status: 500 })
  }

  return NextResponse.json({ prompt: data })
}

// PATCH: 활성 버전 변경 (super_admin만 가능) — 같은 기능의 다른 버전은 자동으로 비활성화
export async function PATCH(request: NextRequest) {
  const guard = await adminGuard('super_admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: target } = await (supabase as any)
    .from('prompt_versions')
    .select('id, feature_type')
    .eq('id', id)
    .single()

  if (!target) return NextResponse.json({ error: '대상을 찾을 수 없습니다' }, { status: 404 })

  await (supabase as any)
    .from('prompt_versions')
    .update({ is_active: false })
    .eq('feature_type', target.feature_type)

  const { error } = await (supabase as any)
    .from('prompt_versions')
    .update({ is_active: true })
    .eq('id', id)

  if (error) return NextResponse.json({ error: '활성화 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
