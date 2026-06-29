import { requireAdmin } from "@/lib/auth/permissions"

export default async function AdminNoticesPage() {
  await requireAdmin()
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">공지사항 관리</h1>
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-400">
        공지사항 관리 기능 준비 중입니다
      </div>
    </div>
  )
}
