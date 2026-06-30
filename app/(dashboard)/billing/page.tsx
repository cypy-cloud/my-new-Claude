import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageTracker } from "@/components/analytics/page-tracker"
import { UpgradeButton } from "@/components/billing/upgrade-button"
import { SubscriptionHistory } from "@/components/billing/subscription-history"
import { AdminPlanSwitcher } from "@/components/billing/admin-plan-switcher"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Zap, Shield, Star, Crown } from "lucide-react"
import { PLANS, type PlanId } from "@/lib/subscription/plans"

const PLAN_UI: Record<PlanId, {
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  border: string
  iconBg: string
  btnClass: string
  scale?: boolean
}> = {
  free:    { icon: Zap,    border: "border-gray-200",    iconBg: "bg-gray-100 text-gray-600",       btnClass: "border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white" },
  basic:   { icon: Shield, border: "border-blue-200",    iconBg: "bg-blue-100 text-blue-600",        btnClass: "bg-blue-600 text-white hover:bg-blue-700", badge: "입문 추천" },
  pro:     { icon: Star,   border: "border-[#1e3a5f]",   iconBg: "bg-[#1e3a5f] text-white",         btnClass: "bg-[#1e3a5f] text-white hover:bg-[#162d4a]", badge: "가장 인기", scale: true },
  premium: { icon: Crown,  border: "border-orange-400",  iconBg: "bg-orange-100 text-orange-500",   btnClass: "bg-orange-500 text-white hover:bg-orange-600", badge: "최고 혜택" },
}

const PLAN_FEATURES: Record<PlanId, { label: string; included: boolean }[]> = {
  free: [
    { label: "AI 문자/카톡 월 5회", included: true },
    { label: "AI 스크립트 월 3회", included: true },
    { label: "PDF 업로드 월 1개", included: true },
    { label: "파일당 5MB", included: true },
    { label: "원본 보관 7일", included: true },
    { label: "우선 처리", included: false },
    { label: "팀 공유", included: false },
  ],
  basic: [
    { label: "AI 문자/카톡 월 50회", included: true },
    { label: "AI 스크립트 월 20회", included: true },
    { label: "PDF 업로드 월 3개", included: true },
    { label: "파일당 10MB", included: true },
    { label: "원본 보관 30일", included: true },
    { label: "우선 처리", included: false },
    { label: "팀 공유", included: false },
  ],
  pro: [
    { label: "AI 문자/카톡 월 300회", included: true },
    { label: "AI 스크립트 월 100회", included: true },
    { label: "PDF 업로드 월 20개", included: true },
    { label: "파일당 30MB", included: true },
    { label: "원본 보관 180일", included: true },
    { label: "우선 처리", included: false },
    { label: "팀 공유", included: false },
  ],
  premium: [
    { label: "AI 문자/카톡 월 1,000회", included: true },
    { label: "AI 스크립트 월 300회", included: true },
    { label: "PDF 업로드 월 50개", included: true },
    { label: "파일당 50MB", included: true },
    { label: "원본 보관 365일", included: true },
    { label: "우선 처리", included: true },
    { label: "팀 공유 (향후 제공)", included: true },
  ],
}

const PLAN_ORDER: PlanId[] = ["free", "basic", "pro", "premium"]

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("plan_type")
    .eq("id", user!.id)
    .single()

  const currentPlanId = (profile?.plan_type as PlanId) ?? "free"

  return (
    <div className="space-y-8 max-w-5xl">
      <PageTracker event="billing_visit" />
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">요금제 선택</h1>
        <p className="text-gray-500 mt-2">업무 규모에 맞는 플랜을 선택하세요. 언제든지 변경 가능합니다.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId]
          const ui = PLAN_UI[planId]
          const features = PLAN_FEATURES[planId]
          const Icon = ui.icon
          const isCurrent = planId === currentPlanId

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
                  {plan.price === 0 ? "무료" : `₩${plan.price.toLocaleString()}`}
                </span>
                {plan.price > 0 && <span className="text-gray-400 text-xs mb-0.5">/월</span>}
              </div>

              <ul className="space-y-2 mb-5 flex-1">
                {features.map((f) => (
                  <li key={f.label} className="flex items-start gap-1.5 text-xs text-gray-600">
                    {f.included ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-0.5" />
                    )}
                    <span className={f.included ? "" : "text-gray-400"}>{f.label}</span>
                  </li>
                ))}
              </ul>

              <UpgradeButton
                planId={planId}
                isCurrent={isCurrent}
                isDowngrade={planId === "free" || PLAN_ORDER.indexOf(planId) < PLAN_ORDER.indexOf(currentPlanId)}
              />
            </div>
          )
        })}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#1e3a5f]">자주 묻는 질문</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { q: "언제든지 플랜을 변경할 수 있나요?", a: "네, 언제든지 업그레이드 또는 다운그레이드 가능합니다. 변경 즉시 적용됩니다." },
            { q: "사용량은 언제 초기화되나요?", a: "매달 1일 자정에 이번 달 사용량이 초기화됩니다." },
            { q: "결제는 어떻게 이루어지나요?", a: "현재 테스트 중입니다. 곧 토스페이먼츠 결제가 연동될 예정입니다." },
            { q: "환불 정책은 어떻게 되나요?", a: "결제 후 7일 이내 미사용 시 전액 환불이 가능합니다." },
          ].map((faq) => (
            <div key={faq.q} className="border-b last:border-0 pb-4 last:pb-0">
              <p className="font-medium text-[#1e3a5f] text-sm mb-1">{faq.q}</p>
              <p className="text-gray-500 text-sm">{faq.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#1e3a5f]">구독 변경 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <SubscriptionHistory />
        </CardContent>
      </Card>

      <AdminPlanSwitcher currentPlan={currentPlanId} />

      <p className="text-center text-sm text-gray-400">
        문의사항은 <Link href="/feedback" className="text-orange-500 hover:underline">고객 피드백</Link>으로 남겨주세요
      </p>
    </div>
  )
}
