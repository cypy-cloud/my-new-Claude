import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/sidebar"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PLAN_LABELS } from "@/types"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) {
    // 프로필이 없으면 자동 생성
    await (supabase as any).from("profiles").insert({
      id: user.id,
      email: user.email,
      full_name: user.email?.split("@")[0] ?? "사용자",
    })
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
