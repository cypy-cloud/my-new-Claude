import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'

// GET /api/admin/users/usage?userId=xxx  — 특정 사용자 사용량 조회
// PATCH /api/admin/users/usage           — 사용량 수동 조정 (admin+)
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId 필수' }, { status: 400 })

  const admin = createAdminClient()
  const month = new Date().toISOString().slice(0, 7)

  const { data } = await (admin as any)
    .from('usage_records')
    .select('usage_month, sms_count, script_count, followup_count, pdf_upload_count, pdf_analysis_count, ai_cost_estimate')
    .eq('user_id', userId)
    .order('usage_month', { ascending: false })
    .limit(6)

  return NextResponse.json({ usage: data ?? [], currentMonth: month })
}

export async function PATCH(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { targetUserId, feature, delta, reason } = body as {
    targetUserId: string
    feature: 'sms_count' | 'script_count' | 'followup_count' | 'pdf_upload_count' | 'pdf_analysis_count'
    delta: number   // 양수: 증가, 음수: 감소
    reason?: string
  }

  const VALID_FEATURES = ['sms_count', 'script_count', 'followup_count', 'pdf_upload_count', 'pdf_analysis_count']
  if (!targetUserId || !VALID_FEATURES.includes(feature) || typeof delta !== 'number') {
    return NextResponse.json({ error: '유효하지 않은 요청' }, { status: 400 })
  }

  const admin = createAdminClient()
  const month = new Date().toISOString().slice(0, 7)

  // upsert usage_records
  const { data: existing } = await (admin as any)
    .from('usage_records')
    .select('id, ' + feature)
    .eq('user_id', targetUserId)
    .eq('usage_month', month)
    .maybeSingle()

  if (existing) {
    const newVal = Math.max(0, (existing[feature] ?? 0) + delta)
    await (admin as any)
      .from('usage_records')
      .update({ [feature]: newVal })
      .eq('id', existing.id)
  } else {
    const newVal = Math.max(0, delta)
    await (admin as any)
      .from('usage_records')
      .insert({ user_id: targetUserId, usage_month: month, [feature]: newVal })
  }

  // 감사 로그
  await (admin as any)
    .from('subscription_events')
    .insert({
      user_id: targetUserId,
      event_type: 'admin_usage_adjust',
      provider: 'admin',
      status: 'completed',
      metadata: { feature, delta, reason: reason ?? null, adjusted_by: guard.ctx.userId },
    })

  return NextResponse.json({ ok: true, feature, delta, adjustedBy: guard.ctx.userId })
}
