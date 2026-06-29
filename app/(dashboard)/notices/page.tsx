import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PageTracker } from "@/components/analytics/page-tracker"
import { Bell, ChevronRight, Megaphone, Wrench, Sparkles, Info } from "lucide-react"

const NOTICES = [
  { id: "1", type: "feature", title: "AI 상담 스크립트 생성기 오픈!", content: "보험 상품별 맞춤형 상담 스크립트를 AI가 자동으로 생성해드립니다. 지금 바로 사용해보세요!", date: "2025-06-29", isPinned: true },
  { id: "2", type: "info", title: "무료 플랜 사용량 안내", content: "무료 플랜은 월 AI 문자 5회, 스크립트 3회, PDF 분석 1회를 제공합니다.", date: "2025-06-25", isPinned: false },
  { id: "3", type: "maintenance", title: "정기 점검 안내 (6월 30일 새벽 2시-4시)", content: "서비스 안정화를 위한 정기 점검이 진행됩니다.", date: "2025-06-24", isPinned: false },
  { id: "4", type: "feature", title: "PDF 분석 기능 업데이트", content: "PDF 텍스트 추출 정확도가 향상되었습니다.", date: "2025-06-20", isPinned: false },
  { id: "5", type: "info", title: "서비스 이용약관 업데이트", content: "개인정보 처리방침이 일부 업데이트되었습니다.", date: "2025-06-15", isPinned: false },
]

const typeConfig: Record<string, { label: string; icon: React.ElementType; badge: string }> = {
  feature: { label: "새 기능", icon: Sparkles, badge: "bg-blue-100 text-blue-700 border-blue-200" },
  info: { label: "안내", icon: Info, badge: "bg-gray-100 text-gray-700 border-gray-200" },
  maintenance: { label: "점검", icon: Wrench, badge: "bg-orange-100 text-orange-700 border-orange-200" },
  warning: { label: "중요", icon: Megaphone, badge: "bg-red-100 text-red-700 border-red-200" },
}

export default function NoticesPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageTracker event="notice_view" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
          <Bell className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">공지사항</h1>
          <p className="text-gray-500 text-sm">서비스 업데이트와 중요 안내를 확인하세요</p>
        </div>
      </div>

      <div className="space-y-3">
        {NOTICES.map((notice) => {
          const config = typeConfig[notice.type] ?? typeConfig.info
          const Icon = config.icon
          return (
            <Card key={notice.id} className={`border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${notice.isPinned ? "border-l-4 border-l-orange-500" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${notice.type === "feature" ? "bg-blue-100" : notice.type === "maintenance" ? "bg-orange-100" : "bg-gray-100"}`}>
                      <Icon className={`h-4 w-4 ${notice.type === "feature" ? "text-blue-600" : notice.type === "maintenance" ? "text-orange-500" : "text-gray-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {notice.isPinned && <Badge className="bg-orange-500 text-white text-xs hover:bg-orange-500">📌 고정</Badge>}
                        <Badge className={`text-xs ${config.badge} hover:${config.badge}`}>{config.label}</Badge>
                        <span className="text-xs text-gray-400">{notice.date}</span>
                      </div>
                      <h3 className="font-semibold text-[#1e3a5f] text-sm mb-1">{notice.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{notice.content}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-center text-sm text-gray-400">전 {NOTICES.length}개의 공지사항</p>
    </div>
  )
}
