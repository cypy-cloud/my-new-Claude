import { redirect } from "next/navigation"
import { getAuthUser, getFullProfile } from "@/lib/auth/session"
import { Sidebar } from "@/components/layout/sidebar"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { DailyQuotePopup } from "@/components/dashboard/daily-quote-popup"
import { PLAN_LABELS } from "@/types"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()

  if (!user) redirect("/login")

  const profile = await getFullProfile(user.id)

  // Force super_admin for known admin email regardless of DB state
  const isKnownAdmin = user.email === "gocypy@gmail.com"
  const effectiveProfile = profile
    ? { ...profile, role: isKnownAdmin ? "super_admin" : profile.role }
    : isKnownAdmin
      ? { id: user.id, email: user.email, name: "관리자", role: "super_admin", plan_type: "free", status: "active" }
      : null

  if (!effectiveProfile) redirect("/login")
  if (effectiveProfile.status === "suspended" || effectiveProfile.status === "deleted") redirect("/login")

  // 카카오 등 소셜 로그인은 handle_new_user() 트리거로 프로필이 바로 생성되어
  // 약관 동의(terms_agreed_at)가 비어 있을 수 있다. /auth/callback이 최초 로그인 시
  // /auth/complete-profile로 보내지만, 그 화면을 건너뛰고 URL로 바로 들어오는 경우까지
  // 막기 위해 대시보드 진입 자체를 게이트한다. isKnownAdmin 우회 계정(profile=null)은
  // 실제 DB 프로필이 아니라 이 체크 대상이 아니다.
  if (profile && !profile.terms_agreed_at) redirect("/auth/complete-profile")

  const planName = PLAN_LABELS[(effectiveProfile.plan_type) as keyof typeof PLAN_LABELS] ?? "무료"

  return (
    <div className="min-h-screen bg-gray-50">
      <DailyQuotePopup />
      <Sidebar profile={effectiveProfile} planName={planName} />
      <DashboardShell profile={effectiveProfile} planName={planName}>
        {children}
      </DashboardShell>
    </div>
  )
}
