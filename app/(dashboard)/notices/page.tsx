import { Bell } from "lucide-react"
import { PageTracker } from "@/components/analytics/page-tracker"
import { NoticesList } from "@/components/notices/notices-list"

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
          <p className="text-gray-500 text-sm mt-0.5">서비스 업데이트와 중요 안내를 확인하세요</p>
        </div>
      </div>
      <NoticesList />
    </div>
  )
}
