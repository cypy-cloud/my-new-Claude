import { requireAdmin } from "@/lib/auth/permissions"
import { createClient } from "@/lib/supabase/server"

export default async function AdminFeedbackPage() {
  await requireAdmin()
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: feedbacks } = await (supabase as any)
    .from("feedback")
    .select("id, content, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">피드백 관리</h1>
      <div className="space-y-4">
        {(feedbacks ?? []).map((f: { id: string; content: string; created_at: string }) => (
          <div key={f.id} className="bg-white rounded-xl shadow-sm border p-4">
            <p className="text-gray-800">{f.content}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(f.created_at).toLocaleString("ko-KR")}</p>
          </div>
        ))}
        {(!feedbacks || feedbacks.length === 0) && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-400">피드백이 없습니다</div>
        )}
      </div>
    </div>
  )
}
