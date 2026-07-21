import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CompleteProfileForm } from "@/components/auth/complete-profile-form"

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] flex items-center justify-center px-4 py-12">
      <CompleteProfileForm nextPath={next && next.startsWith("/") ? next : "/dashboard"} />
    </div>
  )
}
