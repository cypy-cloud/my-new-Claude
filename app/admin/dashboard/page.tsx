import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/permissions"

export default async function AdminDashboardPage() {
  await requireAdmin()
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: totalUsers } = await (supabase as any)
    .from("profiles").select("*", { count: "exact", head: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: activeUsers } = await (supabase as any)
    .from("profiles").select("*", { count: "exact", head: true }).eq("status", "active")

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">관리자 대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-sm text-gray-500">전체 회원</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalUsers ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-sm text-gray-500">활성 회원</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{activeUsers ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-sm text-gray-500">오늘 날짜</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{new Date().toLocaleDateString("ko-KR")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <a href="/admin/users" className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">회원 관리</h2>
          <p className="text-gray-500 text-sm">회원 목록 조회, 역할 및 플랜 변경</p>
        </a>
        <a href="/admin/notices" className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">공지사항 관리</h2>
          <p className="text-gray-500 text-sm">공지사항 작성 및 관리</p>
        </a>
        <a href="/admin/feedback" className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">피드백 관리</h2>
          <p className="text-gray-500 text-sm">고객 피드백 조회 및 처리</p>
        </a>
        <a href="/admin/logs" className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">에러 로그</h2>
          <p className="text-gray-500 text-sm">시스템 에러 로그 조회</p>
        </a>
      </div>
    </div>
  )
}
