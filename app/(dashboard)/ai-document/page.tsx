import { createClient } from "@/lib/supabase/server"
import { PdfUploader } from "@/components/ai/pdf-uploader"
import { getPlanLimits, PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"
import { getMonthlyUsage } from "@/lib/subscription/usage"

export default async function AiDocumentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("plan_type")
    .eq("user_id", user!.id)
    .single()

  const planId = (profile?.plan_type as PlanId) ?? "free"
  const planName = PLAN_LABELS[planId]
  const limits = getPlanLimits(planId)
  const usage = await getMonthlyUsage(user!.id)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI 설명자료 생성</h1>
        <p className="text-gray-600 mt-1">
          보험 약관 PDF를 업로드하면 텍스트를 추출하여 AI 설명자료 생성에 활용합니다
        </p>
      </div>

      <PdfUploader
        initialUploadCount={usage.pdfUploadCount}
        uploadLimit={limits.pdfUploadLimit}
        maxFileSizeMb={limits.maxFileSizeMb}
        storageDays={limits.storageDays}
        planName={planName}
      />
    </div>
  )
}
