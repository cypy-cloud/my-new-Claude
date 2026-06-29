import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Zap, Shield, Users } from "lucide-react"

const PLANS = [
  {
    id: "free", name: "무료", price: 0, icon: Zap,
    color: "border-gray-200", btnClass: "border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white",
    features: ["AI 문자 월 5회", "AI 스크립트 월 3회", "AI 설명자료 월 1회", "결과물 보관 30일", "이메일 지원"],
  },
  {
    id: "pro", name: "프로", price: 29000, icon: Shield, badge: "가장 인기",
    color: "border-[#1e3a5f]", btnClass: "bg-[#1e3a5f] text-white hover:bg-[#162d4a]",
    features: ["AI 문자 월 200회", "AI 스크립트 월 100회", "AI 설명자료 월 30회", "결과물 무제한 보관", "전체 백업 다운로드", "우선 고객 지원"],
  },
  {
    id: "team", name: "팀", price: 79000, icon: Users, badge: "팀용",
    color: "border-orange-400", btnClass: "bg-orange-500 text-white hover:bg-orange-600",
    features: ["AI 문자 월 1,000회", "AI 스크립트 월 500회", "AI 설명자료 월 150회", "팀원 5명 추가", "결과물 무제한 보관", "전담 고객 지원", "팀 통계 대시보드"],
  },
]

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: subscription } = await supabase
    .from("subscriptions").select("plan_id").eq("user_id", user!.id).eq("status", "active").single()

  const currentPlanId = (subscription as { plan_id?: string } | null)?.plan_id ?? "free"

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">요금제 선택</h1>
        <p className="text-gray-500 mt-2">업무 규모에 맞는 플랜을 선택하세요. 언제든지 변경 가능합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          const isCurrent = plan.id === currentPlanId
          return (
            <div key={plan.id} className={`relative bg-white rounded-2xl border-2 ${plan.color} p-6 ${plan.id === "pro" ? "shadow-xl scale-[1.02]" : "shadow-sm"}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className={`${plan.id === "pro" ? "bg-[#1e3a5f] text-white" : "bg-orange-500 text-white"} px-3 py-1`}>
                    {plan.badge}
                  </Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-green-500 text-white px-3 py-1">현재 플랜</Badge>
                </div>
              )}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.id === "pro" ? "bg-[#1e3a5f] text-white" : plan.id === "team" ? "bg-orange-100 text-orange-500" : "bg-gray-100 text-gray-600"}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1e3a5f]">{plan.name}</h3>
              <div className="flex items-end gap-1 my-3">
                <span className="text-3xl font-bold text-[#1e3a5f]">
                  {plan.price === 0 ? "무료" : `₩${plan.price.toLocaleString()}`}
                </span>
                {plan.price > 0 && <span className="text-gray-400 text-sm mb-1">/월</span>}
              </div>
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button className={`w-full h-11 ${plan.btnClass}`} variant={plan.id === "free" && !isCurrent ? "outline" : "default"} disabled={isCurrent} asChild={!isCurrent}>
                {isCurrent ? (
                  <span>현재 사용 중</span>
                ) : (
                  <Link href={`/billing/checkout?plan=${plan.id}`}>
                    {plan.id === "free" ? "다운그레이드" : "업그레이드"}
                  </Link>
                )}
              </Button>
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
            { q: "결제는 어떻게 이루어지나요?", a: "현재 테스트 중입니다. 곳 토스페이먼츠 결제가 연동될 예정입니다." },
            { q: "환불 정책은 어떻게 되나요?", a: "결제 후 7일 이내 미사용 시 전액 환불이 가능합니다." },
          ].map((faq) => (
            <div key={faq.q} className="border-b last:border-0 pb-4 last:pb-0">
              <p className="font-medium text-[#1e3a5f] text-sm mb-1">{faq.q}</p>
              <p className="text-gray-500 text-sm">{faq.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-gray-400">
        문의사항은 <Link href="/feedback" className="text-orange-500 hover:underline">고객 피드백</Link>으로 남겨주세요
      </p>
    </div>
  )
}
