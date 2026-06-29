import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Zap, LayoutDashboard, Users, ArrowLeft, Shield } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  const profileRole = (profile as { role?: string } | null)?.role
  if (!profileRole || !['admin', 'super_admin'].includes(profileRole)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-[#1e3a5f] text-white flex flex-col">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold">FP AI Assistant</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Shield className="h-3 w-3 text-orange-400" />
              <p className="text-xs text-orange-400 font-medium">관리자 모드</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider px-3 mb-3">관리 메뉴</p>
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            <LayoutDashboard className="h-4 w-4" /> 관리자 대시보드
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            <Users className="h-4 w-4" /> 사용자 관리
          </Link>
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:bg-white/10 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> 사용자 화면으로
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
