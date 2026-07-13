"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, TrendingUp, Zap, ArrowRight, Star, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PLANS, type PlanId } from "@/lib/subscription/plans"

interface UpsellConfig {
  targetPlan: "pro" | "premium"
  topUsedFeature: string
  usagePct: number
}

// N배 표기 — 정수면 "3배", 아니면 소수 첫째 자리까지 "3.3배"
function timesLabel(from: number, to: number): string {
  const ratio = to / from
  const rounded = Math.round(ratio * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}배`
}

const UPSELL_COPY: Record<"pro" | "premium", {
  emoji: string
  headline: string
  hook: string
  benefits: string[]
  cta: string
  bg: string
  border: string
  accent: string
  iconBg: string
}> = {
  pro: {
    emoji: "⚡",
    headline: "프로 플랜으로 업그레이드하면 더 많이 쓸 수 있어요!",
    hook: "지금 기본 플랜 한도의 80%를 사용하셨어요. 이대로 가면 이번 달 중 기능이 막힐 수 있습니다.",
    benefits: [
      `AI 문자/카톡 ${PLANS.basic.smsLimit}회 → ${PLANS.pro.smsLimit}회 (${timesLabel(PLANS.basic.smsLimit, PLANS.pro.smsLimit)})`,
      `AI 스크립트 ${PLANS.basic.scriptLimit}회 → ${PLANS.pro.scriptLimit}회 (${timesLabel(PLANS.basic.scriptLimit, PLANS.pro.scriptLimit)})`,
      `PDF 분석 ${PLANS.basic.pdfAnalysisLimit}회 → ${PLANS.pro.pdfAnalysisLimit}회 (${timesLabel(PLANS.basic.pdfAnalysisLimit, PLANS.pro.pdfAnalysisLimit)})`,
      `블로그·SNS 콘텐츠 월 ${PLANS.pro.contentLimit}회 + 뉴스레터 월 ${PLANS.pro.newsletterLimit}회 제공`,
    ],
    cta: `프로로 업그레이드 — ₩${PLANS.pro.price.toLocaleString()}/월`,
    bg: "from-[#1e3a5f] to-[#2d5a9e]",
    border: "border-[#1e3a5f]",
    accent: "text-blue-200",
    iconBg: "bg-white/20",
  },
  premium: {
    emoji: "👑",
    headline: `프리미엄 전환 시 AI 문자 ${timesLabel(PLANS.pro.smsLimit, PLANS.premium.smsLimit)} + 우선 처리까지!`,
    hook: "프로 플랜 한도의 80%를 소진하셨어요. 매달 한도에 걸리고 계신다면 프리미엄이 확실한 해법입니다.",
    benefits: [
      `AI 문자/카톡 ${PLANS.pro.smsLimit}회 → ${PLANS.premium.smsLimit}회 (${timesLabel(PLANS.pro.smsLimit, PLANS.premium.smsLimit)})`,
      `AI 스크립트 ${PLANS.pro.scriptLimit}회 → ${PLANS.premium.scriptLimit}회 (${timesLabel(PLANS.pro.scriptLimit, PLANS.premium.scriptLimit)})`,
      `PDF 분석 ${PLANS.pro.pdfAnalysisLimit}회 → ${PLANS.premium.pdfAnalysisLimit}회 (${timesLabel(PLANS.pro.pdfAnalysisLimit, PLANS.premium.pdfAnalysisLimit)})`,
      `콘텐츠 생성 ${PLANS.pro.contentLimit}회 → ${PLANS.premium.contentLimit}회`,
      `뉴스레터 ${PLANS.pro.newsletterLimit}회 → ${PLANS.premium.newsletterLimit}회 (${timesLabel(PLANS.pro.newsletterLimit, PLANS.premium.newsletterLimit)})`,
      "우선 처리 — 생성 속도 최우선 배정",
    ],
    cta: `프리미엄으로 업그레이드 — ₩${PLANS.premium.price.toLocaleString()}/월`,
    bg: "from-orange-500 to-orange-600",
    border: "border-orange-400",
    accent: "text-orange-100",
    iconBg: "bg-white/20",
  },
}

// 하루 한 번만 표시 (localStorage key)
function getDismissKey(plan: string) {
  const today = new Date().toISOString().slice(0, 10)
  return `upsell_dismissed_${plan}_${today}`
}

interface Props {
  /** billing-dashboard 안에 인라인으로 넣을 때 true */
  inline?: boolean
}

export function UpsellBanner({ inline = false }: Props) {
  const router = useRouter()
  const [config, setConfig] = useState<UpsellConfig | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function checkUsage() {
      try {
        const res = await fetch("/api/billing/usage-status")
        if (!res.ok) return
        const data = await res.json()

        const planId: PlanId = data.planId
        if (planId !== "basic" && planId !== "pro") return

        // 기능별 사용률 계산 → 80% 이상인 것 확인
        const features: { label: string; pct: number }[] = (data.features ?? []).map((f: any) => ({
          label: f.label,
          pct: f.limit > 0 ? (f.used / f.limit) * 100 : 0,
        }))

        const over80 = features.filter(f => f.pct >= 80)
        if (over80.length === 0) return

        const topFeature = over80.sort((a, b) => b.pct - a.pct)[0]
        const targetPlan = planId === "basic" ? "pro" : "premium"

        // 하루 동안 닫은 적 있으면 표시 안 함
        if (typeof window !== "undefined") {
          if (localStorage.getItem(getDismissKey(targetPlan))) return
        }

        setConfig({
          targetPlan,
          topUsedFeature: topFeature.label,
          usagePct: Math.round(topFeature.pct),
        })
      } catch {
        // 조용히 실패
      }
    }
    checkUsage()
  }, [])

  function handleDismiss() {
    if (config) {
      localStorage.setItem(getDismissKey(config.targetPlan), "1")
    }
    setDismissed(true)
  }

  function handleUpgrade() {
    router.push("/billing")
  }

  if (!config || dismissed) return null

  const copy = UPSELL_COPY[config.targetPlan]
  const Icon = config.targetPlan === "pro" ? Star : Crown

  if (inline) {
    // 요금제 페이지 인라인 버전 — 더 상세하게
    return (
      <div className={`rounded-2xl overflow-hidden border-2 ${copy.border} shadow-lg`}>
        <div className={`bg-gradient-to-r ${copy.bg} px-5 py-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${copy.iconBg} shrink-0`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className={`text-xs font-medium ${copy.accent} mb-0.5`}>
                  {copy.emoji} {config.topUsedFeature} {config.usagePct}% 사용 중
                </p>
                <h3 className="text-white font-bold text-sm leading-snug">{copy.headline}</h3>
                <p className={`text-xs ${copy.accent} mt-1 leading-relaxed`}>{copy.hook}</p>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-white/50 hover:text-white shrink-0 mt-0.5">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="bg-white px-5 py-4">
          <p className="text-xs font-semibold text-gray-700 mb-2">업그레이드하면 이런 점이 달라져요</p>
          <ul className="space-y-1.5 mb-4">
            {copy.benefits.map(b => (
              <li key={b} className="flex items-center gap-2 text-xs text-gray-600">
                <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          <Button
            onClick={handleUpgrade}
            className={`w-full text-white font-semibold text-sm gap-2 bg-gradient-to-r ${copy.bg} hover:opacity-90`}
          >
            {copy.cta} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // 전체 페이지 상단 슬라이드인 배너 (간결하게)
  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${copy.bg} rounded-xl shadow-md`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${copy.iconBg} shrink-0`}>
        <TrendingUp className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm leading-snug">
          {copy.emoji} {copy.headline}
        </p>
        <p className={`text-xs ${copy.accent} mt-0.5`}>
          {config.topUsedFeature} {config.usagePct}% 사용 중 · {copy.hook.split(".")[0]}
        </p>
      </div>
      <Button
        size="sm"
        onClick={handleUpgrade}
        className="shrink-0 bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs font-semibold gap-1"
      >
        업그레이드 <ArrowRight className="h-3 w-3" />
      </Button>
      <button onClick={handleDismiss} className="text-white/50 hover:text-white shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
