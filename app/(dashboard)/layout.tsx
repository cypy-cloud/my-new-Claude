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

  if (!profile) {
    // Profile missing — create via admin client (bypasses RLS)
    const { data: newProfile } = await (adminSupabase as any)
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email,
        name: user.email?.split("@")[0] ?? "사용자",
        role: user.email === "gocypy@gmail.com" ? "super_admin" : "user",
      })
      .select("*")
      .single()
    if (newProfile) {
      const planName2 = PLAN_LABELS[(newProfile?.plan_type) as keyof typeof PLAN_LABELS] ?? "무료"
      return (
        <div className="min-h-screen bg-gray-50">
          <Sidebar profile={newProfile} planName={planName2} />
          <DashboardShell profile={newProfile} planName={planName2}>
            {children}
          </DashboardShell>
        </div>
      )
    }
  } else if (profile.role !== "super_admin" && user.email === "gocypy@gmail.com") {
    await (adminSupabase as any).from("profiles").update({ role: "super_admin" }).eq("id", user.id)
    profile.role = "super_admin"
  }
  if (profile?.status === "suspended" || profile?.status === "deleted") redirect("/login")

  const planName = PLAN_LABELS[(profile?.plan_type) as keyof typeof PLAN_LABELS] ?? "무료"

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar profile={profile} planName={planName} />
      <DashboardShell profile={profile} planName={planName}>
        {children}
      </DashboardShell>
    </div>
  )
}
