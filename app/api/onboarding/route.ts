import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackEvent } from '@/lib/analytics/track'

const STEP_FIELDS = ['completed_intro', 'completed_sms_tutorial', 'completed_script_tutorial', 'completed_pdf_tutorial'] as const
type StepField = typeof STEP_FIELDS[number]

// GET: 내 온보딩 상태 조회 (없으면 생성)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: existing } = await (supabase as any)
    .from('user_onboarding')
    .select('id, completed_intro, completed_sms_tutorial, completed_script_tutorial, completed_pdf_tutorial')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ onboarding: existing })

  const { data: created, error } = await (supabase as any)
    .from('user_onboarding')
    .insert({ user_id: user.id })
    .select('id, completed_intro, completed_sms_tutorial, completed_script_tutorial, completed_pdf_tutorial')
    .single()

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json({ onboarding: created })
}

// PATCH: 온보딩/튜토리얼 단계 완료 처리
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const body = await request.json()
  const updates: Partial<Record<StepField, boolean>> = {}
  for (const field of STEP_FIELDS) {
    if (body[field] === true) updates[field] = true
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '변경할 항목이 없습니다' }, { status: 400 })
  }

  const { data, error } = await (supabase as any)
    .from('user_onboarding')
    .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' })
    .select('id, completed_intro, completed_sms_tutorial, completed_script_tutorial, completed_pdf_tutorial')
    .single()

  if (error) return NextResponse.json({ error: '수정 실패' }, { status: 500 })

  if (updates.completed_intro) {
    await trackEvent('tutorial_complete', { userId: user.id })
  }

  return NextResponse.json({ onboarding: data })
}
