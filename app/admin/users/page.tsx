import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/permissions"

export default async function AdminUsersPage() {
  await requireAdmin()
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: users } = await (supabase as any)
    .from("profiles")
    .select("id, email, full_name, role, plan_type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">회원 관리</h1>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600">이메일</th>
              <th className="text-left px-4 py-3 text-gray-600">이름</th>
              <th className="text-left px-4 py-3 text-gray-600">역할</th>
              <th className="text-left px-4 py-3 text-gray-600">플랜</th>
              <th className="text-left px-4 py-3 text-gray-600">상태</th>
              <th className="text-left px-4 py-3 text-gray-600">가입일</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u: { id: string; email: string; full_name?: string; role: string; plan_type?: string; status?: string; created_at: string }) => (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.full_name ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    u.role === "super_admin" ? "bg-red-100 text-red-700" :
                    u.role === "admin" ? "bg-orange-100 text-orange-700" :
                    u.role === "manager" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{u.role}</span>
                </td>
                <td className="px-4 py-3">{u.plan_type ?? "free"}</td>
                <td className="px-4 py-3">{u.status ?? "active"}</td>
                <td className="px-4 py-3">{new Date(u.created_at).toLocaleDateString("ko-KR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!users || users.length === 0) && (
          <div className="text-center py-12 text-gray-400">회원이 없습니다</div>
        )}
      </div>
    </div>
  )
}
