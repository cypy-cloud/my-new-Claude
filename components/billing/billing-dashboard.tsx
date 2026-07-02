"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Zap, Shield, Star, Crown,
  ArrowRight, AlertTriangle, CheckCircle,
  TrendingDown, XCircle, CreditCard, RefreshCw, Info
} from "lucide-react"
import { PLANS, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { UpgradeModal } from "./upgrade-modal"
import { UpsellBanner } from "./upsell-banner"
import { clientTrackUpgradeClick } from "@/lib/analytics/client-track"
import { toast } from "sonner"

// ── 타입 ──────────────────────────────────────────────────────────────────
interface FeatureUsage {
  key: string; label: string; used: number; limit: number; remaining: number; exceeded: boolean
}

interface UsageStatus {
  planId: PlanId; planLabel: string; planPrice: number
  features: FeatureUsage[]
  anyExceeded: boolean; resetDate: string
  recommendedPlanId: PlanId | null; recommendedPlanLabel: string | null; recommendedPlanPrice: number | null
  subscription: {
    status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: string; provider: string
  } | null
}

// ── 아이콘 맵 ────────────────────────────────────────────────────────────
const PLAN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Zap, basic: Shield, pro: Star, premium: Crown
}
const PLAN_COLORS: Record<string, { border: string; iconBg: string; badge: string }> = {
  free:    { border: 'border-gray-200',    iconBg: 'bg-gray-100 text-gray-600',      badge: 'bg-gray-100 text-gray-600' },
  basic:   { border: 'border-blue-200',    iconBg: 'bg-blue-100 text-blue-600',      badge: 'bg-blue-100 text-blue-700' },
  pro:     { border: 'border-[#1e3a5f]',   iconBg: 'bg-[#1e3a5f] text-white',       badge: 'bg-[#1e3a5f] text-white' },
  premium: { border: 'border-orange-400',  iconBg: 'bg-orange-100 text-orange-500',  badge: 'bg-orange-100 text-orange-700' },
}

// ── 사용량 바 ────────────────────────────────────────────────────────────
function UsageBar({ used, limit, exceeded }: { used: number; limit: number; exceeded: boolean }) {
  const pct = Math.min(100, limit > 0 ? Math.round((used / limit) * 100) : 0)
  const color = exceeded ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-[#1e3a5f]'
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── 현재 구독 상태 카드 ──────────────────────────────────────────────────
function CurrentPlanCard({ data, onUpgradeClick }: { data: UsageStatus; onUpgradeClick: () => void }) {
  const Icon = PLAN_ICONS[data.planId] ?? Zap
  const colors = PLAN_COLORS[data.planId] ?? PLAN_COLORS.free
  const sub = data.subscription

  return (
    <Card className={`border-2 ${colors.border} shadow-sm`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.iconBg}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900">{data.planLabel} 플랜</h3>
                {sub?.cancelAtPeriodEnd && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">해지 예약</span>
                )}
                {sub?.status === 'past_due' && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">결제 연체</span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {data.planPrice === 0 ? '무료' : `₩${data.planPrice.toLocaleString()}/월`}
                {sub?.currentPeriodEnd && (
                  <span className="ml-2 text-xs">· 다음 갱신 {sub.currentPeriodEnd.slice(0, 10)}</span>
                )}
              </p>
            </div>
          </div>
          {/* 결제 실패 안내 */}
          {sub?.status === 'past_due' && (
            <div className="flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>결제가 실패했습니다. 카드를 확인해 주세요.</span>
            </div>
          )}
        </div>

        {/* 사용량 목록 */}
        <div className="space-y-2.5">
          {data.features.map(f => (
            <div key={f.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">{f.label}</span>
                <span className={`text-xs font-medium ${f.exceeded ? 'text-red-500' : 'text-gray-700'}`}>
                  {f.exceeded
                    ? '한도 초과'
                    : `${f.used} / ${f.limit}회 (${f.remaining}회 남음)`
                  }
                </span>
              </div>
              <UsageBar used={f.used} limit={f.limit} exceeded={f.exceeded} />
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          매달 1일 초기화 · 다음 초기화 {data.resetDate}
        </p>

        {/* 한도 초과 시 업그레이드 유도 (과하지 않게) */}
        {data.anyExceeded && data.recommendedPlanId && (
          <div className="mt-4 flex items-center justify-between gap-3 p-3 bg-[#1e3a5f]/5 border border-[#1e3a5f]/15 rounded-xl">
            <p className="text-xs text-[#1e3a5f] leading-relaxed">
              일부 기능의 이번 달 한도를 모두 사용했습니다.
              더 많은 생성이 필요하시면 상위 요금제로 업그레이드해 주세요.
            </p>
            <Button
              size="sm"
              onClick={onUpgradeClick}
              className="shrink-0 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-xs gap-1"
            >
              업그레이드 <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── 다운그레이드 신청 placeholder ────────────────────────────────────────
function DowngradeSection({ currentPlanId }: { currentPlanId: PlanId }) {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)

  if (currentPlanId === 'free') return null

  function handleRequest() {
    // placeholder: 실제 연동 시 API 호출
    setSent(true)
    toast.success('다운그레이드 신청이 접수되었습니다. 다음 결제일 이후 변경됩니다.')
  }

  return (
    <div className="border-t pt-4 mt-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <TrendingDown className="h-3.5 w-3.5" />
        요금제 다운그레이드
      </button>
      {open && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm">
          <p className="text-gray-600 mb-3">
            다운그레이드는 현재 결제 기간 종료 후 적용됩니다.
            남은 기간의 이용료는 환불되지 않습니다.
          </p>
          {sent ? (
            <div className="flex items-center gap-1.5 text-green-600 text-xs">
              <CheckCircle className="h-3.5 w-3.5" />
              신청이 접수되었습니다
            </div>
          ) : (
            <div className="flex gap-2">
              {(['free', 'basic', 'pro'] as PlanId[])
                .filter(p => {
                  const order = ['free','basic','pro','premium']
                  return order.indexOf(p) < order.indexOf(currentPlanId)
                })
                .map(p => (
                  <Button key={p} size="sm" variant="outline" onClick={handleRequest} className="text-xs">
                    {PLAN_LABELS[p]}으로 변경
                  </Button>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 구독 해지 placeholder ────────────────────────────────────────────────
function CancelSection({ currentPlanId, cancelAtPeriodEnd, periodEnd }: {
  currentPlanId: PlanId; cancelAtPeriodEnd: boolean; periodEnd?: string
}) {
  const [open, setOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [done, setDone] = useState(cancelAtPeriodEnd)

  if (currentPlanId === 'free') return null

  async function handleCancel() {
    setCanceling(true)
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediately: false }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '해지 처리 중 오류가 발생했습니다')
        return
      }
      setDone(true)
      toast.success(data.message ?? '구독 해지가 예약되었습니다')
    } catch {
      toast.error('네트워크 오류가 발생했습니다')
    } finally {
      setCanceling(false)
    }
  }

  return (
    <div className="border-t pt-4 mt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
      >
        <XCircle className="h-3.5 w-3.5" />
        구독 해지
      </button>
      {open && (
        <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200 text-sm">
          {done ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-red-600 font-medium text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                해지가 예약되었습니다
              </div>
              <p className="text-gray-500 text-xs">
                {periodEnd ? `${periodEnd.slice(0, 10)} 이후` : '현재 기간 종료 후'} 무료 플랜으로 전환됩니다.
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-700 mb-1 font-medium">정말 해지하시겠습니까?</p>
              <p className="text-gray-500 text-xs mb-3">
                현재 결제 기간({periodEnd?.slice(0, 10) ?? '이번 달 말'}) 이후 무료 플랜으로 전환됩니다.
                사용 중인 데이터는 유지됩니다.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="text-xs"
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleCancel}
                  disabled={canceling}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white border-0"
                >
                  {canceling ? '처리 중...' : '해지 신청'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── 결제 실패 안내 placeholder ───────────────────────────────────────────
function PaymentFailedBanner({ status }: { status: string }) {
  const [dismissed, setDismissed] = useState(false)
  if (status !== 'past_due' || dismissed) return null

  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
      <CreditCard className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-700 mb-1">결제에 실패했습니다</p>
        <p className="text-xs text-red-600 leading-relaxed">
          등록된 카드로 결제가 이루어지지 않았습니다.
          카드 정보를 확인하거나 다른 카드로 변경해 주세요.
          결제가 계속 실패하면 서비스 이용이 제한될 수 있습니다.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          * 실제 카드 변경 기능은 Toss/Stripe 연동 후 활성화됩니다.
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="text-red-300 hover:text-red-500">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export function BillingDashboard({ initialPlanId }: { initialPlanId: PlanId }) {
  const router = useRouter()
  const [data, setData] = useState<UsageStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/usage-status')
      const d = await res.json()
      setData(d)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleUpgradeClick(source?: string) {
    if (!data?.recommendedPlanId) {
      router.push('/billing')
      return
    }
    if (source) clientTrackUpgradeClick({ targetPlan: data.recommendedPlanId, source })
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        불러오는 중...
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-5">
      {/* 결제 실패 배너 */}
      {data.subscription && <PaymentFailedBanner status={data.subscription.status} />}

      {/* 80% 이상 사용 시 업셀링 배너 (인라인 상세 버전) */}
      {(data.planId === 'basic' || data.planId === 'pro') && (
        <UpsellBanner inline />
      )}

      {/* 현재 플랜 + 사용량 */}
      <CurrentPlanCard data={data} onUpgradeClick={() => handleUpgradeClick('plan_card')} />

      {/* 다운그레이드 / 구독 해지 */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Info className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">구독 관리</span>
          </div>
          <DowngradeSection currentPlanId={data.planId} />
          <CancelSection
            currentPlanId={data.planId}
            cancelAtPeriodEnd={data.subscription?.cancelAtPeriodEnd ?? false}
            periodEnd={data.subscription?.currentPeriodEnd}
          />
          {data.planId === 'free' && (
            <p className="text-sm text-gray-400">현재 무료 플랜을 사용 중입니다.</p>
          )}
        </CardContent>
      </Card>

      {/* 업그레이드 모달 */}
      {data.recommendedPlanId && (
        <UpgradeModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          currentPlanId={data.planId}
          recommendedPlanId={data.recommendedPlanId}
        />
      )}
    </div>
  )
}
