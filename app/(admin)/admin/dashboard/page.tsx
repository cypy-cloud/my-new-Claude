import { requireAdmin } from "@/lib/auth/permissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, CreditCard, Zap, TrendingUp, MessageSquare, BookOpen, FileText, AlertCircle } from "lucide-react"

const MOCK_STATS = {
  totalUsers: 1247,
  activeSubscriptions: 389,
  aiUsageThisMonth: 48320,
  monthlyRevenue: 11281000,
  newUsersToday: 23,
  proUsers: 312,
  teamUsers: 77,
  freeUsers: 858,
}

const RECENT_ACTIVITY = [
  { id: "1", user: "김보험", action: "프로 플랜 업그레이드", time: "5분 전", type: "upgrade" },
  { id: "2", user: "이재무", action: "AI 문자 생성 (15회)", time: "12분 전", type: "usage" },
  { id: "3", user: "박FP", action: "신규 가입", time: "28분 전", type: "signup" },
  { id: "4", user: "최설계사", action: "PDF 분석 사용 (3회)", time: "45분 전", type: "usage" },
  { id: "5", user: "정보험왕", action: "팀 플랜 업그레이드", time: "1시간 전", type: "upgrade" },
]

const AI_USAGE = [
  { label: "AI 문자 생성", icon: MessageSquare, count: 28450, color: "bg-blue-500", pct: 59 },
  { label: "AI 스크립트", icon: BookOpen, count: 14200, color: "bg-purple-500", pct: 29 },
  { label: "AI PDF 분석", icon: FileText, count: 5670, color: "bg-orange-500", pct: 12 },
]

export default async function AdminDashboardPage() {
  const { role } = await requireAdmin()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">관리자 대시보드</h1>
          <p className="text-gray-500 mt-1">FP AI Assistant 서비스 현황 — {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <Badge className="bg-[#1e3a5f] text-white px-3 py-1">{role === "super_admin" ? "슈퍼 관리자" : "관리자"}</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "전체 사용자", value: MOCK_STATS.totalUsers.toLocaleString(), sub: `오늘 +${MOCK_STATS.newUsersToday}명`, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "활성 구독", value: MOCK_STATS.activeSubscriptions.toLocaleString(), sub: "유료 플랜 이용 중", icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "이번 달 AI 사용", value: MOCK_STATS.aiUsageThisMonth.toLocaleString(), sub: "문자+스크립트+PDF", icon: Zap, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "이번 달 매출", value: `₩${(MOCK_STATS.monthlyRevenue / 10000).toFixed(0)}만`, sub: "구독 결제 합산", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#1e3a5f]">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#1e3a5f]">플랜별 사용자 분포</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "무료 플랜", count: MOCK_STATS.freeUsers, color: "bg-gray-400", pct: Math.round(MOCK_STATS.freeUsers / MOCK_STATS.totalUsers * 100) },
              { label: "프로 플랜", count: MOCK_STATS.proUsers, color: "bg-[#1e3a5f]", pct: Math.round(MOCK_STATS.proUsers / MOCK_STATS.totalUsers * 100) },
              { label: "팀 플랜", count: MOCK_STATS.teamUsers, color: "bg-orange-500", pct: Math.round(MOCK_STATS.teamUsers / MOCK_STATS.totalUsers * 100) },
            ].map((plan) => (
              <div key={plan.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-700">{plan.label}</span>
                  <span className="text-gray-500">{plan.count.toLocaleString()}명 ({plan.pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${plan.color} rounded-full`} style={{ width: `${plan.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#1e3a5f]">AI 기능별 사용량 (이번 달)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {AI_USAGE.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2 text-gray-700"><Icon className="h-3.5 w-3.5 text-gray-400" />{item.label}</span>
                    <span className="text-gray-500">{item.count.toLocaleString()}회 ({item.pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${item.type === "upgrade" ? "bg-orange-500" : item.type === "signup" ? "bg-green-500" : "bg-[#1e3a5f]"}`}>
                    {item.user[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.user}</p>
                    <p className="text-xs text-gray-500">{item.action}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${item.type === "upgrade" ? "bg-orange-100 text-orange-700" : item.type === "signup" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {item.type === "upgrade" ? "업그레이드" : item.type === "signup" ? "신규 가입" : "AI 사용"}
                  </Badge>
                  <span className="text-xs text-gray-400">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>현재 통계는 목업 데이터입니다. Phase 5에서 실제 Supabase 데이터와 연동됩니다.</span>
      </div>
    </div>
  )
}
