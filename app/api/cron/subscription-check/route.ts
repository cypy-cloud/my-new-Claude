import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { expireSubscription, activateSubscription, recordPayment } from '@/lib/billing/subscription-service'
import { notifyRenewalReminder, notifyPlanExpired } from '@/lib/notifications/create-notification'
import { TossProvider } from '@/lib/billing/toss-provider'
import { PLANS, PLAN_LABELS, type PlanId } from '@/lib/subscription/plans'

// Vercel Cron이 매일 호출한다. Authorization: Bearer <CRON_SECRET> 헤더로 인증.
// 만료된 유료 구독은: 등록된 빌링키가 있으면 자동 청구를 시도해 갱신하고,
// 빌링키가 없거나 청구가 실패하면 무료 플랜으로 자동 전환한다.
// 만료 3일 전에는 재결제 리마인더 알림을 보낸다.
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
  const provider = new TossProvider()

  // 1. 이미 만료된 유료 구독 → 빌링키 자동 청구 시도, 실패/미등록 시 무료 플랜 전환
  const { data: expired } = await (admin as any)
    .from('subscriptions')
    .select('user_id, plan_type, profiles!inner(toss_billing_key, toss_customer_key)')
    .eq('status', 'active')
    .neq('plan_type', 'free')
    .lt('current_period_end', now.toISOString())

  let expiredCount = 0
  let renewedCount = 0
  for (const row of expired ?? []) {
    const planId = row.plan_type as PlanId
    const billingKey = row.profiles?.toss_billing_key
    const customerKey = row.profiles?.toss_customer_key

    if (billingKey && customerKey) {
      const orderId = `renew-${row.user_id.replace(/-/g, '').slice(0, 10)}-${Date.now()}`
      const result = await provider.chargeBillingKey({
        billingKey,
        customerKey,
        amount: PLANS[planId].price,
        orderId,
        orderName: `FP AI Assistant ${PLANS[planId].name} 플랜 정기결제`,
      })

      if (result.success) {
        await activateSubscription({ userId: row.user_id, planType: planId, provider: 'toss', providerCustomerId: customerKey })
        await recordPayment({
          userId: row.user_id,
          amount: PLANS[planId].price,
          provider: 'toss',
          providerTxId: result.paymentKey ?? orderId,
          status: 'succeeded',
        })
        renewedCount++
        continue
      }
    }

    await expireSubscription(row.user_id)
    await notifyPlanExpired(row.user_id, PLAN_LABELS[planId] ?? planId)
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

  return NextResponse.json({ expiredCount, renewedCount, reminderCount })
}

export async function GET(request: NextRequest) {
  return handleCheck(request)
}

export async function POST(request: NextRequest) {
  return handleCheck(request)
}
