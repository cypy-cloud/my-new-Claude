import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CompleteProfileForm } from "@/components/auth/complete-profile-form"
import { isSafeRedirectPath } from "@/lib/auth/safe-redirect"

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const nextPath = isSafeRedirectPath(next) ? next : "/dashboard"

  // 이미 약관 동의를 마친 사용자가 이 URL로 직접(재)방문하면, 폼이 마케팅 수신동의
  // 등을 항상 미체크 상태로 초기 렌더링하기 때문에 재제출 시 기존 동의값이 조용히
  // 덮어써질 수 있다 — 이미 완료된 사용자는 그냥 통과시킨다.
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("terms_agreed_at")
    .eq("id", user.id)
    .single()

  if (profile?.terms_agreed_at) redirect(nextPath)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] flex items-center justify-center px-4 py-12">
      <CompleteProfileForm nextPath={nextPath} />
    </div>
  )
}
