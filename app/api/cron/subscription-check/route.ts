import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { expireSubscription } from '@/lib/billing/subscription-service'
import { notifyRenewalReminder, notifyPlanExpired } from '@/lib/notifications/create-notification'
import { PLAN_LABELS, type PlanId } from '@/lib/subscription/plans'

// Vercel Cron이 매일 호출한다. Authorization: Bearer <CRON_SECRET> 헤더로 인증.
// 자동 정기결제(빌링키)가 아직 없어서, 만료된 유료 구독은 자동으로 무료 플랜으로
// 전환하고, 만료 3일 전에는 재결제 리마인더 알림을 보낸다.
async function handleCheck(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET이 설정되지 않았습니다' }, { status: 503 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // 1. 이미 만료된 유료 구독 → 무료 플랜으로 자동 전환
  const { data: expired } = await (admin as any)
    .from('subscriptions')
    .select('user_id, plan_type')
    .eq('status', 'active')
    .neq('plan_type', 'free')
    .lt('current_period_end', now.toISOString())

  let expiredCount = 0
  for (const row of expired ?? []) {
    await expireSubscription(row.user_id)
    await notifyPlanExpired(row.user_id, PLAN_LABELS[row.plan_type as PlanId] ?? row.plan_type)
    expiredCount++
  }

  // 2. 3일 이내 만료 예정인 유료 구독 → 재결제 리마인더 (하루 1회만 발송, notifyRenewalReminder 내부에서 중복 방지)
  const { data: expiringSoon } = await (admin as any)
    .from('subscriptions')
    .select('user_id, plan_type, current_period_end')
    .eq('status', 'active')
    .neq('plan_type', 'free')
    .gte('current_period_end', now.toISOString())
    .lte('current_period_end', in3Days.toISOString())

  let reminderCount = 0
  for (const row of expiringSoon ?? []) {
    await notifyRenewalReminder(
      row.user_id,
      PLAN_LABELS[row.plan_type as PlanId] ?? row.plan_type,
      row.current_period_end
    )
    reminderCount++
  }

  return NextResponse.json({ expiredCount, reminderCount })
}

export async function GET(request: NextRequest) {
  return handleCheck(request)
}

export async function POST(request: NextRequest) {
  return handleCheck(request)
}
