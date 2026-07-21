import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import { createNotification } from '@/lib/notifications/create-notification'
import { PLAN_LABELS } from '@/lib/subscription/plans'
import { REVIEW_TRIAL_MIN_LENGTH, REVIEW_TRIAL_DAYS, REVIEW_TRIAL_PLAN } from '@/lib/subscription/review-trial'

// POST: 이용후기 무료체험 지급 — 200자 이상 피드백 + 계정당 1회 + 무료 사용자만 대상
export async function POST(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const body = await request.json()
  const { feedbackId } = body
  if (!feedbackId) return NextResponse.json({ error: 'feedbackId가 필요합니다' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: feedback } = await (supabase as any)
    .from('feedback')
    .select('id, user_id, content, trial_granted')
    .eq('id', feedbackId)
    .single()

  if (!feedback) return NextResponse.json({ error: '피드백을 찾을 수 없습니다' }, { status: 404 })
  if (feedback.trial_granted) return NextResponse.json({ error: '이미 이 피드백으로 체험이 지급되었습니다' }, { status: 409 })
  if ((feedback.content?.length ?? 0) < REVIEW_TRIAL_MIN_LENGTH) {
    return NextResponse.json({ error: `${REVIEW_TRIAL_MIN_LENGTH}자 이상 작성된 피드백만 지급 가능합니다` }, { status: 400 })
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('plan_type, review_trial_granted')
    .eq('id', feedback.user_id)
    .single()

  if (!profile) return NextResponse.json({ error: '대상 사용자를 찾을 수 없습니다' }, { status: 404 })
  if (profile.review_trial_granted) {
    return NextResponse.json({ error: '이 사용자는 이미 이용후기 체험을 받은 적이 있습니다(계정당 1회)' }, { status: 409 })
  }
  if (profile.plan_type !== 'free') {
    return NextResponse.json({ error: '무료 플랜 사용자에게만 지급할 수 있습니다' }, { status: 400 })
  }

  const trialExpiresAt = new Date(Date.now() + REVIEW_TRIAL_DAYS * 24 * 60 * 60 * 1000)

  const { error: profileError } = await (supabase as any)
    .from('profiles')
    .update({
      plan_type: REVIEW_TRIAL_PLAN,
      trial_expires_at: trialExpiresAt.toISOString(),
      review_trial_granted: true,
    })
    .eq('id', feedback.user_id)

  if (profileError) return NextResponse.json({ error: '지급 실패' }, { status: 500 })

  await (supabase as any)
    .from('feedback')
    .update({ trial_granted: true })
    .eq('id', feedbackId)

  const planLabel = PLAN_LABELS[REVIEW_TRIAL_PLAN]
  await createNotification({
    userId: feedback.user_id,
    type: 'billing',
    title: `${planLabel} 플랜 ${REVIEW_TRIAL_DAYS}일 무료체험이 시작되었습니다!`,
    message: `소중한 후기 감사합니다. ${trialExpiresAt.toLocaleDateString('ko-KR')}까지 ${planLabel} 플랜을 무료로 체험하실 수 있습니다.`,
    actionUrl: '/billing',
  })

  return NextResponse.json({ ok: true, trialExpiresAt: trialExpiresAt.toISOString() })
}
