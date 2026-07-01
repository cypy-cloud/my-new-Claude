"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatsCard } from "./stats-card"
import { CreditCard, Users, TrendingUp, AlertCircle, RefreshCw, CheckCircle, XCircle, Clock, Ban } from "lucide-react"

// ── 타입 ─────────────────────────────────────────────────────────────────
interface Subscription {
  id: string; userId: string; planType: string; status: string
  provider: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean
  createdAt: string; email: string; fullName: string | null
}

interface Payment {
  id: string; userId: string; amount: number; currency: string
  provider: string; providerTxId: string | null; status: string
  paidAt: string | null; createdAt: string; email: string
}

interface RevenueStats {
  totalRevenue: number
  monthlyRevenue: { month: string; amount: number; count: number }[]
  byProvider: { provider: string; amount: number; count: number }[]
  byPlan: { planType: string; planLabel: string; amount: number; count: number }[]
}

// ── 배지 ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  active:    { label: '활성', className: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
  trialing:  { label: '체험', className: 'bg-blue-100 text-blue-700', icon: <Clock className="h-3 w-3" /> },
  past_due:  { label: '연체', className: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="h-3 w-3" /> },
  canceled:  { label: '해지', className: 'bg-gray-100 text-gray-600', icon: <Ban className="h-3 w-3" /> },
  expired:   { label: '만료', className: 'bg-red-100 text-red-600', icon: <XCircle className="h-3 w-3" /> },
  succeeded: { label: '성공', className: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
  failed:    { label: '실패', className: 'bg-red-100 text-red-600', icon: <XCircle className="h-3 w-3" /> },
  pending:   { label: '대기', className: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3" /> },
  refunded:  { label: '환불', className: 'bg-purple-100 text-purple-700', icon: <RefreshCw className="h-3 w-3" /> },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600', icon: null }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-[#1e3a5f]/10 text-[#1e3a5f]',
  premium: 'bg-orange-100 text-orange-700',
}
const PLAN_LABELS: Record<string, string> = { free: '무료', basic: '기본', pro: '프로', premium: '프리미엄' }

function PlanBadge({ planType }: { planType: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[planType] ?? 'bg-gray-100 text-gray-600'}`}>
      {PLAN_LABELS[planType] ?? planType}
    </span>
  )
}

function fmt(amount: number, currency = 'KRW') {
  return currency === 'KRW' ? `₩${amount.toLocaleString()}` : `$${(amount / 100).toFixed(2)}`
}

function fmtDate(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// ── 매출 통계 탭 ─────────────────────────────────────────────────────────
function StatsTab() {
  const [data, setData] = useState<RevenueStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/billing?tab=stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
  if (!data) return <div className="py-12 text-center text-red-500 text-sm">데이터를 불러오지 못했습니다</div>

  const maxMonthly = Math.max(...data.monthlyRevenue.map(m => m.amount), 1)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="누적 매출" value={fmt(data.totalRevenue)}
          icon={TrendingUp} iconBg="bg-green-50" iconColor="text-green-600" highlight
        />
        {data.byPlan.map(p => (
          <StatsCard
            key={p.planType}
            label={`${p.planLabel} 플랜`}
            value={fmt(p.amount)}
            sub={`${p.count}건`}
            icon={CreditCard} iconBg="bg-blue-50" iconColor="text-blue-600"
          />
        ))}
      </div>

      {/* 월별 매출 차트 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">월별 매출 추이</CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthlyRevenue.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">결제 내역 없음</p>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {data.monthlyRevenue.map(m => {
                const heightPct = Math.round((m.amount / maxMonthly) * 100)
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500">{fmt(m.amount)}</span>
                    <div className="w-full flex items-end" style={{ height: '100px' }}>
                      <div
                        className="w-full rounded-t bg-[#1e3a5f] transition-all"
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                        title={`${m.month}: ${fmt(m.amount)} (${m.count}건)`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">{m.month.slice(5)}월</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 공급자별 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">결제 공급자별</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {data.byProvider.map(p => (
              <div key={p.provider} className="py-2 flex items-center justify-between text-sm">
                <span className="font-medium capitalize text-gray-700">{p.provider}</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 text-xs">{p.count}건</span>
                  <span className="font-semibold text-gray-800">{fmt(p.amount)}</span>
                </div>
              </div>
            ))}
            {data.byProvider.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">결제 내역 없음</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── 구독 목록 탭 ─────────────────────────────────────────────────────────
function SubscriptionsTab() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ tab: 'subscriptions', limit: '50' })
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/admin/billing?${params}`)
    const d = await res.json()
    setSubs(d.subscriptions ?? [])
    setTotal(d.total ?? 0)
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const statuses = ['', 'active', 'trialing', 'past_due', 'canceled', 'expired']

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {statuses.map(s => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s ? (STATUS_CONFIG[s]?.label ?? s) : '전체'}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">총 {total}건</span>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : subs.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">구독 내역 없음</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">사용자</th>
                  <th className="px-4 py-3 text-left">플랜</th>
                  <th className="px-4 py-3 text-left">상태</th>
                  <th className="px-4 py-3 text-left">공급자</th>
                  <th className="px-4 py-3 text-left">갱신일</th>
                  <th className="px-4 py-3 text-left">가입일</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subs.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{s.fullName ?? '-'}</div>
                      <div className="text-xs text-gray-400">{s.email}</div>
                    </td>
                    <td className="px-4 py-3"><PlanBadge planType={s.planType} /></td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                      {s.cancelAtPeriodEnd && (
                        <span className="ml-1 text-[10px] text-orange-500">해지예약</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{s.provider}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(s.currentPeriodEnd)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── 결제 내역 탭 ─────────────────────────────────────────────────────────
function PaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ tab: 'payments', limit: '50' })
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/admin/billing?${params}`)
    const d = await res.json()
    setPayments(d.payments ?? [])
    setTotal(d.total ?? 0)
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const statuses = ['', 'succeeded', 'failed', 'pending', 'refunded', 'canceled']

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {statuses.map(s => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s ? (STATUS_CONFIG[s]?.label ?? s) : '전체'}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">총 {total}건</span>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">결제 내역 없음</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">사용자</th>
                  <th className="px-4 py-3 text-right">금액</th>
                  <th className="px-4 py-3 text-left">상태</th>
                  <th className="px-4 py-3 text-left">공급자</th>
                  <th className="px-4 py-3 text-left">결제일시</th>
                  <th className="px-4 py-3 text-left">트랜잭션 ID</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">{p.email}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(p.amount, p.currency)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{p.provider}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(p.paidAt ?? p.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono truncate max-w-[140px]" title={p.providerTxId ?? ''}>
                      {p.providerTxId ? p.providerTxId.slice(0, 20) + '…' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export function AdminBilling() {
  const [tab, setTab] = useState<'stats' | 'subscriptions' | 'payments'>('stats')

  const tabs = [
    { key: 'stats' as const, label: '매출 통계', icon: TrendingUp },
    { key: 'subscriptions' as const, label: '구독 현황', icon: Users },
    { key: 'payments' as const, label: '결제 내역', icon: CreditCard },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#1e3a5f]">결제 관리</h2>
          <p className="text-sm text-gray-500">구독 현황, 결제 내역, 매출 통계를 확인합니다</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-[#1e3a5f] text-[#1e3a5f]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats'         && <StatsTab />}
      {tab === 'subscriptions' && <SubscriptionsTab />}
      {tab === 'payments'      && <PaymentsTab />}

      <p className="text-xs text-gray-400 text-center pt-2">
        실제 결제 연동 전: mock 데이터만 표시됩니다. Toss 또는 Stripe 키 설정 후 실데이터 반영.
      </p>
    </div>
  )
}
