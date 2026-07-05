import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageTracker } from "@/components/analytics/page-tracker"
import { SubscriptionHistory } from "@/components/billing/subscription-history"
import { AdminPlanSwitcher } from "@/components/billing/admin-plan-switcher"
import { BillingDashboard } from "@/components/billing/billing-dashboard"
import { BillingPlans } from "@/components/billing/billing-plans"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type PlanId } from "@/lib/subscription/plans"

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

      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">요금제 선택</h1>
        <p className="text-gray-500 mt-2">업무 규모에 맞는 플랜을 선택하세요. 언제든지 변경 가능합니다.</p>
      </div>

      {/* 현재 플랜 + 사용량 대시보드 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 mb-3">현재 구독 현황</h2>
        <BillingDashboard initialPlanId={currentPlanId} />
      </div>

      {/* 요금제 비교 카드 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 mb-3">요금제 비교</h2>
        <BillingPlans currentPlanId={currentPlanId} />
      </div>

      {/* 자주 묻는 질문 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#1e3a5f]">자주 묻는 질문</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { q: "언제든지 플랜을 변경할 수 있나요?", a: "네, 언제든지 업그레이드 또는 다운그레이드 가능합니다. 변경 즉시 적용됩니다." },
            { q: "사용량은 언제 초기화되나요?", a: "매달 1일 자정에 이번 달 사용량이 초기화됩니다." },
            { q: "결제는 어떻게 이루어지나요?", a: "토스페이먼츠를 통해 신용카드, 체크카드, 간편결제(카카오페이, 네이버페이 등)로 결제할 수 있습니다." },
            { q: "환불 정책은 어떻게 되나요?", a: "결제 후 7일 이내 미사용 시 전액 환불이 가능합니다." },
            { q: "구독 해지 시 데이터는 어떻게 되나요?", a: "구독 해지 후에도 기존에 생성한 데이터는 유지됩니다. 단, 무료 플랜의 저장 용량과 보관 기간 제한이 적용됩니다." },
          ].map((faq) => (
            <div key={faq.q} className="border-b last:border-0 pb-4 last:pb-0">
              <p className="font-medium text-[#1e3a5f] text-sm mb-1">{faq.q}</p>
              <p className="text-gray-500 text-sm">{faq.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 구독 변경 이력 */}
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
