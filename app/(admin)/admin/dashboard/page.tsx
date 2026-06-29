import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, CreditCard, Zap, TrendingUp } from "lucide-react"

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
          <p className="text-gray-600 mt-1">FP AI Assistant 서비스 현황</p>
        </div>
        <Badge variant="outline" className="border-yellow-400 text-yellow-600">Admin</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription className="flex items-center space-x-2"><Users className="h-4 w-4" /><span>전체 사용자</span></CardDescription><CardTitle className="text-3xl">-</CardTitle></CardHeader><CardContent><p className="text-xs text-gray-500">Phase 5에서 구현</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription className="flex items-center space-x-2"><CreditCard className="h-4 w-4" /><span>활성 구독</span></CardDescription><CardTitle className="text-3xl">-</CardTitle></CardHeader><CardContent><p className="text-xs text-gray-500">Phase 5에서 구현</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription className="flex items-center space-x-2"><Zap className="h-4 w-4" /><span>이번 달 AI 사용</span></CardDescription><CardTitle className="text-3xl">-</CardTitle></CardHeader><CardContent><p className="text-xs text-gray-500">Phase 5에서 구현</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription className="flex items-center space-x-2"><TrendingUp className="h-4 w-4" /><span>월 매출</span></CardDescription><CardTitle className="text-3xl">-</CardTitle></CardHeader><CardContent><p className="text-xs text-gray-500">Phase 5에서 구현</p></CardContent></Card>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-3 text-gray-400">
          <TrendingUp className="h-12 w-12" />
          <p className="text-sm font-medium">관리자 대시보드 - Phase 5에서 상세 구현됩니다</p>
          <p className="text-xs">사용자 통계, 매출 분석, AI 사용량 등이 추가될 예정입니다</p>
        </CardContent>
      </Card>
    </div>
  )
}
