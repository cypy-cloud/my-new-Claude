"use client"

import { useEffect, useState } from "react"
import { Clock, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"

interface SubscriptionEvent {
  id: string
  event_type: string
  from_plan: string | null
  to_plan: string | null
  amount: number | null
  provider: string | null
  status: string
  created_at: string
}

const EVENT_LABELS: Record<string, string> = {
  upgrade: "업그레이드",
  downgrade: "다운그레이드",
  cancel: "구독 취소",
  payment_success: "결제 성공",
  payment_fail: "결제 실패",
  checkout_initiated: "결제 시작",
  webhook: "웹훅",
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-600",
}

export function SubscriptionHistory() {
  const [events, setEvents] = useState<SubscriptionEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/billing/history")
      .then(r => r.json())
      .then(d => setEvents(d.events ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="h-20 flex items-center justify-center text-gray-400 text-sm">불러오는 중...</div>
  if (events.length === 0) return (
    <div className="flex flex-col items-center py-8 text-gray-400 gap-2">
      <Clock className="h-8 w-8 text-gray-200" />
      <p className="text-sm">구독 변경 이력이 없습니다</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {events.map(ev => {
        const isUpgrade = ev.event_type === "upgrade"
        const isDowngrade = ev.event_type === "downgrade"
        const isFail = ev.event_type === "payment_fail" || ev.status === "failed"
        const Icon = isUpgrade ? TrendingUp : isDowngrade ? TrendingDown : isFail ? AlertCircle : Clock

        return (
          <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isUpgrade ? "bg-green-100 text-green-600" :
              isDowngrade ? "bg-amber-100 text-amber-600" :
              isFail ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-500"
            }`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-800">
                  {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                </span>
                {ev.from_plan && ev.to_plan && (
                  <span className="text-xs text-gray-500">
                    {PLAN_LABELS[ev.from_plan as PlanId] ?? ev.from_plan} →{" "}
                    {PLAN_LABELS[ev.to_plan as PlanId] ?? ev.to_plan}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[ev.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {ev.status === "completed" ? "완료" : ev.status === "pending" ? "처리 중" : ev.status === "failed" ? "실패" : ev.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {ev.amount !== null && ev.amount > 0 && (
                  <span className="text-xs text-gray-500">₩{ev.amount.toLocaleString()}</span>
                )}
                {ev.provider && (
                  <span className="text-xs text-gray-400 uppercase">{ev.provider}</span>
                )}
                <span className="text-xs text-gray-400">{new Date(ev.created_at).toLocaleDateString("ko-KR")}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
