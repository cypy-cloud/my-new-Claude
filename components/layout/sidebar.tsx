"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { clientTrackEvent } from "@/lib/analytics/client-track"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard, MessageSquare, FileText, BookOpen,
  Settings, LogOut, Zap, Archive, CreditCard,
  Bell, BookMarked, MessageCircle, Shield, Rocket, Users, Building2, BarChart2, LibraryBig, PenSquare, Mail,
} from "lucide-react"
import { PLAN_LABELS } from "@/types"
import type { Profile } from "@/types"

const mainNav = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/customers", label: "고객 관리", icon: Users },
  { href: "/ai-message", label: "AI 문자/카톡", icon: MessageSquare },
  { href: "/ai-script", label: "AI 상담 스크립트", icon: BookOpen },
  { href: "/ai-document", label: "AI PDF 분석", icon: FileText },
  { href: "/my-results", label: "내 결과물 보관함", icon: Archive },
  { href: "/templates", label: "템플릿 라이브러리", icon: LibraryBig },
  { href: "/content-creator", label: "블로그·SNS 콘텐츠", icon: PenSquare },
  { href: "/newsletter", label: "뉴스레터 생성", icon: Mail },
  { href: "/team", label: "팀 관리", icon: Building2 },
  { href: "/report", label: "사용 리포트", icon: BarChart2 },
  { href: "/billing", label: "요금제", icon: CreditCard },
]

const supportNav = [
  { href: "/notices", label: "공지사항", icon: Bell },
  { href: "/changelog", label: "변경사항", icon: Rocket },
  { href: "/guide", label: "사용 가이드", icon: BookMarked },
  { href: "/feedback", label: "고객 피드백", icon: MessageCircle },
]

interface SidebarProps {
  profile: Profile | null
  planName?: string
}

function NavLink({ href, label, icon: Icon, pathname }: {
  href: string; label: string; icon: React.ElementType; pathname: string
}) {
  const isActive = pathname === href || pathname.startsWith(href + "/")
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
        isActive
          ? "bg-orange-500 text-white shadow-sm"
          : "text-blue-100 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-white" : "text-blue-300")} />
      <span>{label}</span>
    </Link>
  )
}

export function Sidebar({ profile, planName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin"
  const displayPlanName = planName ?? PLAN_LABELS[profile?.plan_type ?? 'free'] ?? '무료'

  async function handleLogout() {
    const supabase = createClient()
    await clientTrackEvent('logout')
    await supabase.auth.signOut()
    toast.success("로그아웃 되었습니다.")
    router.push("/login")
  }

  return (
    <>
    <style>{`.sidebar-nav::-webkit-scrollbar{display:none!important;width:0!important}`}</style>
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-[#1e3a5f] overflow-hidden">
      <div className="flex items-center h-16 px-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm leading-none block">FP AI Assistant</span>
            <span className="text-blue-300 text-xs">보험설계사 AI</span>
          </div>
        </Link>
      </div>

      <nav className="sidebar-nav flex-1 min-h-0 px-3 py-2 space-y-0 overflow-y-auto" style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
        <p className="text-xs font-semibold text-blue-400 px-3 mb-1 uppercase tracking-wider">AI 기능</p>
        {mainNav.map((item) => <NavLink key={item.href} {...item} pathname={pathname} />)}

        <div className="my-1.5 border-t border-white/10" />

        <p className="text-xs font-semibold text-blue-400 px-3 mb-1 uppercase tracking-wider">고객지원</p>
        {supportNav.map((item) => <NavLink key={item.href} {...item} pathname={pathname} />)}

        {isAdmin && (
          <>
            <div className="my-1.5 border-t border-white/10" />
            <p className="text-xs font-semibold text-blue-400 px-3 mb-1 uppercase tracking-wider">관리자</p>
            <NavLink href="/admin/dashboard" label="관리자 페이지" icon={Shield} pathname={pathname} />
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <Link href="/settings" className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1",
          pathname === "/settings" ? "bg-orange-500 text-white" : "text-blue-100 hover:bg-white/10"
        )}>
          <Settings className="h-4 w-4 text-blue-300" />
          <span>설정</span>
        </Link>
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {(profile?.name ?? profile?.email ?? "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.name ?? profile?.email ?? "사용자"}
            </p>
            <Badge className="text-xs bg-orange-500/20 text-orange-300 border-orange-500/30 mt-0.5 hover:bg-orange-500/20">
              {displayPlanName}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-blue-300 hover:text-white hover:bg-white/10 gap-2"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </aside>
    </>
  )
}
