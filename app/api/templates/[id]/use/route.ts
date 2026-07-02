import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const feature_type = body.feature_type ?? 'ai_message'

  // 템플릿 존재 & 접근 권한 확인
  const { data: template } = await (createAdminClient() as any)
    .from('content_templates')
    .select('id, is_premium, is_public, is_active')
    .eq('id', id)
    .single()

  if (!template || !template.is_public || !template.is_active) {
    return NextResponse.json({ error: '템플릿을 찾을 수 없습니다' }, { status: 404 })
  }

  if (template.is_premium) {
    const { data: profile } = await (createAdminClient() as any)
      .from('profiles')
      .select('plan_type')
      .eq('id', user.id)
      .single()
    const isPremium = ['pro', 'premium', 'team'].includes(profile?.plan_type ?? '')
    if (!isPremium) return NextResponse.json({ error: '프리미엄 플랜이 필요합니다' }, { status: 403 })
  }

  await (createAdminClient() as any)
    .from('template_usage_logs')
    .insert({ template_id: id, user_id: user.id, feature_type })

  return NextResponse.json({ ok: true })
}
