"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Zap, Shield, Star, Crown } from "lucide-react"
import { PLANS, type PlanId } from "@/lib/subscription/plans"
import { UpgradeButton } from "@/components/billing/upgrade-button"

interface UsageStatus {
  smsCount: number
  scriptCount: number
  pdfUploadCount: number
  pdfAnalysisCount: number
  contentCount: number
  newsletterCount: number
}

const PLAN_UI: Record<PlanId, {
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  border: string
  iconBg: string
  scale?: boolean
}> = {
  free:    { icon: Zap,    border: "border-gray-200",    iconBg: "bg-gray-100 text-gray-600" },
  basic:   { icon: Shield, border: "border-blue-200",    iconBg: "bg-blue-100 text-blue-600",      badge: "입문 추천" },
  pro:     { icon: Star,   border: "border-[#1e3a5f]",   iconBg: "bg-[#1e3a5f] text-white",        badge: "가장 인기", scale: true },
  premium: { icon: Crown,  border: "border-orange-400",  iconBg: "bg-orange-100 text-orange-500",  badge: "최고 혜택" },
}

function getPlanFeatures(planId: PlanId) {
  const plan = PLANS[planId]
  const features: { label: string; included: boolean }[] = []

  if (planId === "free") {
    features.push(
      { label: `AI 문자/카톡 월 ${plan.smsLimit}회`, included: true },
      { label: "AI 스크립트", included: false },
      { label: "PDF 설명자료 분석", included: false },
      { label: `파일당 ${plan.maxFileSizeMb}MB`, included: true },
      { label: `원본 보관 ${plan.storageDays}일`, included: true },
      { label: "블로그·SNS 콘텐츠", included: false },
      { label: "뉴스레터 생성", included: false },
      { label: "우선 처리", included: false },
      { label: "팀 공유", included: false },
    )
  } else if (planId === "basic") {
    features.push(
      { label: `AI 문자/카톡 월 ${plan.smsLimit}회`, included: true },
      { label: `AI 스크립트 월 ${plan.scriptLimit}회`, included: true },
      { label: `PDF 업로드 월 ${plan.pdfUploadLimit}개`, included: true },
      { label: `파일당 ${plan.maxFileSizeMb}MB`, included: true },
      { label: `원본 보관 ${plan.storageDays}일`, included: true },
      { label: "블로그·SNS 콘텐츠", included: false },
      { label: "뉴스레터 생성", included: false },
      { label: "우선 처리", included: false },
      { label: "팀 공유", included: false },
    )
  } else if (planId === "pro") {
    features.push(
      { label: `AI 문자/카톡 월 ${plan.smsLimit}회`, included: true },
      { label: `AI 스크립트 월 ${plan.scriptLimit}회`, included: true },
      { label: `PDF 업로드 월 ${plan.pdfUploadLimit}개`, included: true },
      { label: `파일당 ${plan.maxFileSizeMb}MB`, included: true },
      { label: `원본 보관 ${plan.storageDays}일`, included: true },
      { label: `블로그·SNS 콘텐츠 월 ${plan.contentLimit}회`, included: true },
      { label: `뉴스레터 생성 월 ${plan.newsletterLimit}회`, included: true },
      { label: "우선 처리", included: false },
      { label: "팀 공유", included: false },
    )
  } else {
    features.push(
      { label: `AI 문자/카톡 월 ${plan.smsLimit}회`, included: true },
      { label: `AI 스크립트 월 ${plan.scriptLimit}회`, included: true },
      { label: `PDF 업로드 월 ${plan.pdfUploadLimit}개`, included: true },
      { label: `파일당 ${plan.maxFileSizeMb}MB`, included: true },
      { label: `원본 보관 ${plan.storageDays}일`, included: true },
      { label: `블로그·SNS 콘텐츠 월 ${plan.contentLimit}회`, included: true },
      { label: `뉴스레터 생성 월 ${plan.newsletterLimit}회`, included: true },
      { label: "우선 처리", included: true },
      { label: "팀 공유 (향후 제공)", included: true },
    )
  }

  return features
}

const PLAN_ORDER: PlanId[] = ["free", "basic", "pro", "premium"]

interface BillingPlansProps {
  currentPlanId: PlanId
}

export function BillingPlans({ currentPlanId }: BillingPlansProps) {
  const [usage, setUsage] = useState<UsageStatus | null>(null)

  useEffect(() => {
    fetch('/api/billing/usage-status')
      .then(r => r.json())
      .then(data => {
        setUsage({
          smsCount: data.features?.find((f: any) => f.key === 'sms')?.used ?? 0,
          scriptCount: data.features?.find((f: any) => f.key === 'script')?.used ?? 0,
          pdfUploadCount: data.features?.find((f: any) => f.key === 'pdf_upload')?.used ?? 0,
          pdfAnalysisCount: data.features?.find((f: any) => f.key === 'pdf_analysis')?.used ?? 0,
          contentCount: 0,
          newsletterCount: 0,
        })
      })
      .catch(() => null)
  }, [])

  return (
    <div className="space-y-4">
      {/* 플랜 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId]
          const ui = PLAN_UI[planId]
          const features = getPlanFeatures(planId)
          const Icon = ui.icon
          const isCurrent = planId === currentPlanId
          const isDowngrade = PLAN_ORDER.indexOf(planId) < PLAN_ORDER.indexOf(currentPlanId)

          const displayPrice = plan.price
          const priceLabel = plan.price > 0 ? "/월" : null

          return (
            <div
              key={planId}
              className={`relative bg-white rounded-2xl border-2 ${ui.border} p-5 flex flex-col ${
                ui.scale ? "shadow-xl lg:scale-[1.03]" : "shadow-sm"
              }`}
            >
              {ui.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <Badge className={`${planId === "pro" ? "bg-[#1e3a5f]" : planId === "basic" ? "bg-blue-600" : "bg-orange-500"} text-white px-3 py-1 text-xs`}>
                    {ui.badge}
                  </Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-3">
                  <Badge className="bg-green-500 text-white px-2 py-1 text-xs">현재 플랜</Badge>
                </div>
              )}

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${ui.iconBg}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-[#1e3a5f]">{plan.name}</h3>
              <div className="flex items-end gap-1 my-2">
                <span className="text-2xl font-bold text-[#1e3a5f]">
                  {displayPrice === 0 ? "무료" : `₩${displayPrice.toLocaleString()}`}
                </span>
                {priceLabel && <span className="text-gray-400 text-xs mb-0.5">{priceLabel}</span>}
              </div>
              <ul className="space-y-2 mb-5 flex-1">
                {features.map((f) => (
                  <li key={f.label} className="flex items-start gap-1.5 text-xs text-gray-600">
                    {f.included
                      ? <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      : <XCircle className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-0.5" />
                    }
                    <span className={f.included ? "" : "text-gray-400"}>{f.label}</span>
                  </li>
                ))}
              </ul>

              <UpgradeButton
                planId={planId}
                isCurrent={isCurrent}
                isDowngrade={isDowngrade}
                currentPlanId={currentPlanId}
                currentUsage={usage}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
