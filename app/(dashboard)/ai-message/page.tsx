import { createClient } from "@/lib/supabase/server"
import { MessageGenerator } from "@/components/ai/message-generator"

export default async function AiMessagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const yearMonth = new Date().toISOString().slice(0, 7)

  const [{ data: subscription }, { data: usage }] = await Promise.all([
    supabase.from("subscriptions").select("plan_id").eq("user_id", user!.id).eq("status", "active").single(),
    supabase.from("monthly_usage").select("ai_message_count").eq("user_id", user!.id).eq("year_month", yearMonth).maybeSingle(),
  ])

  const planId = (subscription as { plan_id?: string } | null)?.plan_id ?? "free"

  const { data: plan } = await supabase
    .from("plans")
    .select("ai_message_limit, name")
    .eq("id", planId)
    .single()

  const limit = (plan as { ai_message_limit?: number } | null)?.ai_message_limit ?? 5
  const planName = (plan as { name?: string } | null)?.name ?? "무료"
  const currentUsage = (usage as { ai_message_count?: number } | null)?.ai_message_count ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI 문자/카톡 생성기</h1>
        <p className="text-gray-600 mt-1">고객에게 보낼 맞춤형 메시지를 AI가 즉시 작성해드립니다</p>
      </div>

      <MessageGenerator
        initialUsage={currentUsage}
        limit={limit}
        planName={planName}
      />
    </div>
  )
}
