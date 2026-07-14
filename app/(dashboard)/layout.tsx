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
