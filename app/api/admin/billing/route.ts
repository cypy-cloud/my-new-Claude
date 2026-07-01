import { NextRequest, NextResponse } from 'next/server'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import { adminListSubscriptions, adminListPayments } from '@/lib/billing/subscription-service'
import { adminGetRevenueStats } from '@/lib/billing/invoice-service'
import type { SubscriptionStatus, PaymentStatus, BillingProvider } from '@/lib/billing/billing-provider'

// GET /api/admin/billing?tab=subscriptions|payments|stats
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const sp = request.nextUrl.searchParams
  const tab = sp.get('tab') ?? 'subscriptions'
  const limit = Math.min(parseInt(sp.get('limit') ?? '50'), 100)
  const offset = parseInt(sp.get('offset') ?? '0')
  const status = sp.get('status') as SubscriptionStatus | PaymentStatus | null
  const provider = sp.get('provider') as BillingProvider | null

  if (tab === 'stats') {
    const stats = await adminGetRevenueStats()
    return NextResponse.json(stats)
  }

  if (tab === 'payments') {
    const result = await adminListPayments({
      status: status as PaymentStatus | undefined,
      provider: provider ?? undefined,
      limit,
      offset,
    })
    return NextResponse.json(result)
  }

  // default: subscriptions
  const result = await adminListSubscriptions({
    status: status as SubscriptionStatus | undefined,
    provider: provider ?? undefined,
    limit,
    offset,
  })
  return NextResponse.json(result)
}
