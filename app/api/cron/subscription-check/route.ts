import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { expireSubscription, activateSubscription, recordPayment } from '@/lib/billing/subscription-service'
import { notifyRenewalReminder, notifyPlanExpired } from '@/lib/notifications/create-notification'
import { PortOneProvider } from '@/lib/billing/portone-provider'
import { getActiveRedemption, incrementRedemptionUsage } from '@/lib/billing/discount'
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
  const provider = new PortOneProvider()

  // 1. 이미 만료된 유료 구독 → 빌링키 자동 청구 시도, 실패/미등록 시 무료 플랜 전환
  const { data: expired } = await (admin as any)
    .from('subscriptions')
    .select('user_id, plan_type, profiles!inner(portone_billing_key, portone_customer_id)')
    .eq('status', 'active')
    .neq('plan_type', 'free')
    .lt('current_period_end', now.toISOString())

  let expiredCount = 0
  let renewedCount = 0
  for (const row of expired ?? []) {
    // 사용자 한 명 처리 중 예외가 나도 나머지 사용자 처리가 통째로 중단되지 않도록 격리
    try {
      const planId = row.plan_type as PlanId
      const billingKey = row.profiles?.portone_billing_key
      const customerId = row.profiles?.portone_customer_id

      if (billingKey && customerId) {
        // 할인코드로 가입한 계정이 아직 할인 회차(최초 3개월)가 남아있고, 가입 당시와
        // 같은 플랜을 유지 중이면 갱신 결제에도 동일 할인율을 적용한다.
        const activeRedemption = await getActiveRedemption(row.user_id)
        const applyDiscount = activeRedemption && activeRedemption.planId === planId
        const amount = applyDiscount
          ? Math.round(PLANS[planId].price * (1 - activeRedemption!.discountPercent / 100))
          : PLANS[planId].price
        const paymentId = `renew${row.user_id.replace(/-/g, '').slice(0, 10)}${Date.now()}`
        const result = await provider.chargeBillingKey({
          billingKey,
          customerId,
          amount,
          paymentId,
          orderName: `FP AI Assistant ${PLANS[planId].name} 플랜 정기결제 (월간)`,
        })

        if (result.success) {
          // 청구 성공 직후 곧바로 결제 기록부터 남긴다 — activateSubscription()이
          // 이후 실패해도 "돈은 빠졌는데 기록이 없는" 상태가 되지 않도록 함
          // (신규 구독 결제와 동일한 원칙, 2026-07-21 실결제 테스트 중 발견된
          // 이중 청구 사고 재발 방지 — 이 크론은 그 수정이 누락되어 있었음)
          await recordPayment({
            userId: row.user_id,
            amount,
            provider: 'portone',
            providerTxId: result.paymentId ?? paymentId,
            status: 'succeeded',
          })

          const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
          await activateSubscription({
            userId: row.user_id,
            planType: planId,
            provider: 'portone',
            providerCustomerId: customerId,
            billingInterval: 'month',
            periodEnd,
          })
          if (applyDiscount) {
            await incrementRedemptionUsage(row.user_id).catch(() => null)
          }
          renewedCount++
          continue
        }
      }

      await expireSubscription(row.user_id)
      await notifyPlanExpired(row.user_id, PLAN_LABELS[planId] ?? planId)
      expiredCount++
    } catch (e) {
      console.error(`[subscription-check] user ${row.user_id} 처리 실패:`, e)
    }
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
