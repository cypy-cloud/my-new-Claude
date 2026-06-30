import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Sidebar } from "@/components/layout/sidebar"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PLAN_LABELS } from "@/types"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminSupabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (adminSupabase as any)
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

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
      <Sidebar profile={effectiveProfile} planName={planName} />
      <DashboardShell profile={effectiveProfile} planName={planName}>
        {children}
      </DashboardShell>
    </div>
  )
}
