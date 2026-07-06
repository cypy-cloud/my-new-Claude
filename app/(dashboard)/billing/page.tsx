import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageTracker } from "@/components/analytics/page-tracker"
import { SubscriptionHistory } from "@/components/billing/subscription-history"
import { AdminPlanSwitcher } from "@/components/billing/admin-plan-switcher"
import { BillingDashboard } from "@/components/billing/billing-dashboard"
import { BillingPlans } from "@/components/billing/billing-plans"
import { TossCardRegister } from "@/components/billing/toss-card-register"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type PlanId } from "@/lib/subscription/plans"

const PAID_PLANS: PlanId[] = ["basic", "pro", "premium"]

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("plan_type, scheduled_plan_type, scheduled_plan_date, billing_card_last4, billing_card_brand")
    .eq("id", user!.id)
    .single()

  const currentPlanId = (profile?.plan_type as PlanId) ?? "free"
  const scheduledPlanId = (profile?.scheduled_plan_type as PlanId) ?? null
  const scheduledPlanDate = profile?.scheduled_plan_date ?? null
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY

  return (
    <div className="space-y-8 max-w-5xl">
      <PageTracker event="billing_visit" />

      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">요금제 선택</h1>
        <p className="text-gray-500 mt-2">업무 규모에 맞는 플랜을 선택하세요. 언제든지 변경 가능합니다.</p>
      </div>

      {/* 예약된 다운그레이드 안내 */}
      {scheduledPlanId && scheduledPlanDate && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
          <span className="text-amber-500 mt-0.5">⏳</span>
          <div>
            <p className="text-sm font-medium text-amber-800">플랜 변경 예약됨</p>
            <p className="text-sm text-amber-700 mt-0.5">
              <strong>{scheduledPlanDate}</strong>부터 <strong>{scheduledPlanId}</strong> 플랜으로 변경됩니다.
              그 전까지는 현재 플랜을 계속 이용하실 수 있습니다.
            </p>
          </div>
        </div>
      )}

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

      {/* 자동결제 카드 등록 */}
      {PAID_PLANS.includes(currentPlanId) && clientKey && (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">자동결제 카드 관리</h2>
          <TossCardRegister
            userId={user!.id}
            clientKey={clientKey}
            cardLast4={profile?.billing_card_last4}
            cardBrand={profile?.billing_card_brand}
          />
        </div>
      )}

      {/* 자주 묻는 질문 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#1e3a5f]">자주 묻는 질문</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { q: "언제든지 플랜을 변경할 수 있나요?", a: "네, 언제든지 변경 가능합니다. 업그레이드는 즉시 적용됩니다. 다운그레이드는 현재 달 말일까지 기존 플랜을 유지하고, 다음 달 1일부터 새 플랜이 적용됩니다." },
            { q: "사용량은 언제 초기화되나요?", a: "매달 1일 자정에 이번 달 사용량이 초기화됩니다. 업그레이드 시 이미 사용한 횟수는 그대로 유지되므로, 매월 1일에 업그레이드하시면 새 플랜의 한도를 100% 활용하실 수 있습니다." },
            { q: "결제는 어떻게 이루어지나요?", a: "토스페이먼츠를 통해 신용카드, 체크카드, 간편결제(카카오페이, 네이버페이 등)로 결제할 수 있습니다." },
            { q: "환불 정책은 어떻게 되나요?", a: "결제 후 서비스를 1회라도 사용한 경우 환불이 불가합니다. 미사용 상태라면 결제일로부터 7일 이내에 고객센터로 문의해 주세요." },
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
