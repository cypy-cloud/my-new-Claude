import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'

const VALID_FEATURES = ['all', 'ai_message', 'ai_script', 'ai_document', 'ai_followup']

// GET /api/admin/users/restrict?userId=xxx
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId 필수' }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await (admin as any)
    .from('user_restrictions')
    .select('id, feature, reason, expires_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ restrictions: data ?? [] })
}

// POST /api/admin/users/restrict
export async function POST(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { targetUserId, feature, reason, expiresAt } = body as {
    targetUserId: string
    feature: string
    reason?: string
    expiresAt?: string | null
  }

  if (!targetUserId || !VALID_FEATURES.includes(feature)) {
    return NextResponse.json({ error: '유효하지 않은 요청' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await (admin as any)
    .from('user_restrictions')
    .upsert({
      user_id: targetUserId,
      feature,
      reason: reason ?? null,
      restricted_by: guard.ctx.userId,
      expires_at: expiresAt ?? null,
    }, { onConflict: 'user_id,feature' })

  if (error) return NextResponse.json({ error: '제한 설정 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/users/restrict?userId=xxx&feature=xxx
export async function DELETE(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const userId = request.nextUrl.searchParams.get('userId')
  const feature = request.nextUrl.searchParams.get('feature')

  if (!userId || !feature) return NextResponse.json({ error: 'userId, feature 필수' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await (admin as any)
    .from('user_restrictions')
    .delete()
    .eq('user_id', userId)
    .eq('feature', feature)

  if (error) return NextResponse.json({ error: '제한 해제 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
