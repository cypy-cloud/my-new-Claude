import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyPlanExpired } from '@/lib/notifications/create-notification'
import { PLAN_LABELS } from '@/lib/subscription/plans'

// Vercel Cron이 매일 호출한다. Authorization: Bearer <CRON_SECRET> 헤더로 인증.
// 이용후기 이벤트로 지급된 무료체험(profiles.trial_expires_at)이 만료된 사용자를
// 찾아 무료 플랜으로 되돌린다. 결제 없는 프로모션이라 subscriptions/payments 테이블은
// 건드리지 않는다 — app/api/cron/subscription-check(실결제 구독 갱신)와 완전히 분리된
// 별도 크론으로 둬서 결제 로직에 영향을 주지 않도록 했다.
async function handleExpire(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET이 설정되지 않았습니다' }, { status: 503 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: expired } = await (admin as any)
    .from('profiles')
    .select('id, plan_type')
    .not('trial_expires_at', 'is', null)
    .lte('trial_expires_at', now)

  let expiredCount = 0
  for (const row of expired ?? []) {
    try {
      await (admin as any)
        .from('profiles')
        .update({ plan_type: 'free', trial_expires_at: null })
        .eq('id', row.id)

      await notifyPlanExpired(row.id, `${PLAN_LABELS[row.plan_type as keyof typeof PLAN_LABELS] ?? row.plan_type} (체험)`)
      expiredCount++
    } catch (e) {
      console.error(`[review-trial-expire] user ${row.id} 처리 실패:`, e)
    }
  }

  return NextResponse.json({ expiredCount })
}

export async function GET(request: NextRequest) {
  return handleExpire(request)
}

export async function POST(request: NextRequest) {
  return handleExpire(request)
}
