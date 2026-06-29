import { requireAdmin } from "@/lib/auth/permissions"
import { createClient } from "@/lib/supabase/server"

export default async function AdminLogsPage() {
  await requireAdmin()
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logs } = await (supabase as any)
    .from("error_logs")
    .select("id, area, error_message, severity, resolved, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">에러 로그</h1>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600">영역</th>
              <th className="text-left px-4 py-3 text-gray-600">메시지</th>
              <th className="text-left px-4 py-3 text-gray-600">심각도</th>
              <th className="text-left px-4 py-3 text-gray-600">해결</th>
              <th className="text-left px-4 py-3 text-gray-600">시간</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((l: { id: string; area: string; error_message: string; severity: string; resolved: boolean; created_at: string }) => (
              <tr key={l.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{l.area}</td>
                <td className="px-4 py-3 max-w-xs truncate">{l.error_message}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    l.severity === "critical" ? "bg-red-100 text-red-700" :
                    l.severity === "high" ? "bg-orange-100 text-orange-700" :
                    l.severity === "medium" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{l.severity}</span>
                </td>
                <td className="px-4 py-3">{l.resolved ? "✅" : "❌"}</td>
                <td className="px-4 py-3">{new Date(l.created_at).toLocaleString("ko-KR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!logs || logs.length === 0) && (
          <div className="text-center py-12 text-gray-400">에러 로그가 없습니다</div>
        )}
      </div>
    </div>
  )
}
