import Link from 'next/link'
import { Zap, LayoutDashboard, Users, ArrowLeft, Shield, ShieldCheck, Crown, AlertTriangle, Megaphone, MessageSquareWarning, Sparkles, FileX2, Database } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/permissions'
import type { UserRole } from '@/lib/auth/permissions'

const ROLE_LABELS: Record<UserRole, string> = {
  user: '일반',
  manager: '매니저',
  admin: '관리자',
  super_admin: '슈퍼관리자',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // requireAdmin: admin 미만이면 /dashboard 로 redirect
  const { role } = await requireAdmin()
  const isSuperAdmin = role === 'super_admin'

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
              <p className="text-xs text-orange-400 font-medium">{ROLE_LABELS[role]} 모드</p>
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
          <Link href="/admin/errors" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            <AlertTriangle className="h-4 w-4" /> 에러 로그
          </Link>
          <Link href="/admin/announcements" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            <Megaphone className="h-4 w-4" /> 공지사항 관리
          </Link>
          <Link href="/admin/feedback" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            <MessageSquareWarning className="h-4 w-4" /> 피드백 관리
          </Link>
          <Link href="/admin/prompts" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            <Sparkles className="h-4 w-4" /> 프롬프트 관리
          </Link>
          <Link href="/admin/file-cleanup" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            <FileX2 className="h-4 w-4" /> 원본 PDF 정리
          </Link>
          <Link href="/admin/backup" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            <Database className="h-4 w-4" /> 데이터 백업
          </Link>
          {isSuperAdmin && (
            <>
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider px-3 mb-3 mt-6">슈퍼관리자</p>
              <Link href="/admin/permissions" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                <ShieldCheck className="h-4 w-4" /> 권한 관리
              </Link>
            </>
          )}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 mb-2">
            <Crown className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-xs text-white/40">{ROLE_LABELS[role]}</span>
          </div>
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:bg-white/10 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> 사용자 화면으로
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
