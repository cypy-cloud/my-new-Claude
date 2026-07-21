"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Zap, LayoutDashboard, Users, ArrowLeft, Shield, ShieldCheck, Crown,
  AlertTriangle, Megaphone, MessageSquareWarning, Sparkles, FileX2, Database,
  Rocket, Building2, Tag, CreditCard, HardDrive, Settings, Star, ShieldX,
  Activity, BarChart2, LibraryBig,
} from "lucide-react"
import type { UserRole } from "@/lib/auth/permissions"

const ROLE_LABELS: Record<UserRole, string> = {
  user: "일반",
  manager: "매니저",
  admin: "관리자",
  super_admin: "슈퍼관리자",
}

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "관리자 대시보드", icon: LayoutDashboard },
  { href: "/admin/monitoring", label: "운영 모니터링", icon: Activity },
  { href: "/admin/report", label: "분석 리포트", icon: BarChart2 },
  { href: "/admin/users", label: "사용자 관리", icon: Users },
  { href: "/admin/errors", label: "에러 로그", icon: AlertTriangle },
  { href: "/admin/announcements", label: "공지사항 관리", icon: Megaphone },
  { href: "/admin/feedback", label: "피드백 관리", icon: MessageSquareWarning },
  { href: "/admin/prompts", label: "프롬프트 관리", icon: Sparkles },
  { href: "/admin/templates", label: "템플릿 관리", icon: LibraryBig },
  { href: "/admin/insurance-companies", label: "보험사별 프롬프트", icon: Building2 },
  { href: "/admin/product-categories", label: "상품 카테고리 관리", icon: Tag },
  { href: "/admin/file-cleanup", label: "원본 PDF 정리", icon: FileX2 },
  { href: "/admin/billing", label: "결제 관리", icon: CreditCard },
  { href: "/admin/ai-logs", label: "AI 요청 로그", icon: Sparkles },
  { href: "/admin/ai-quality", label: "AI 품질 통계", icon: Star },
  { href: "/admin/safety-stats", label: "컴플라이언스 통계", icon: ShieldX },
  { href: "/admin/storage", label: "저장공간 관리", icon: HardDrive },
  { href: "/admin/system-settings", label: "시스템 설정", icon: Settings },
  { href: "/admin/backup", label: "데이터 백업", icon: Database },
  { href: "/admin/app-versions", label: "버전 관리", icon: Rocket },
]

interface AdminSidebarProps {
  role: UserRole
  onNavigate?: () => void
  mobile?: boolean
}

export function AdminSidebar({ role, onNavigate, mobile }: AdminSidebarProps) {
  const isSuperAdmin = role === "super_admin"

  return (
    <aside className={cn(
      "bg-[#1e3a5f] text-white flex flex-col overflow-hidden",
      // AdminShell이 이 컴포넌트를 md:pl-64(왼쪽 여백)가 걸린 컨테이너 안에서 렌더링하는데,
      // fixed 요소는 left를 명시하지 않으면 부모의 padding까지 반영된 정적 위치를 그대로
      // 물려받아 화면 왼쪽 끝이 아니라 오른쪽으로 밀려 렌더링된다 — md:left-0으로 고정해서
      // 뷰포트 왼쪽 끝에 항상 붙도록 강제한다(2026-07-22 실사용 중 발견).
      mobile ? "w-64 h-full" : "hidden md:flex md:w-64 md:fixed md:inset-y-0 md:left-0"
    )}>
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10 flex-shrink-0">
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

      <nav className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-1">
        <p className="text-xs text-white/40 font-semibold uppercase tracking-wider px-3 mb-3">관리 메뉴</p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}

        {isSuperAdmin && (
          <>
            <p className="text-xs text-white/40 font-semibold uppercase tracking-wider px-3 mb-3 mt-6">슈퍼관리자</p>
            <Link
              href="/admin/permissions"
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ShieldCheck className="h-4 w-4" /> 권한 관리
            </Link>
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1.5 mb-2">
          <Crown className="h-3.5 w-3.5 text-orange-400" />
          <span className="text-xs text-white/40">{ROLE_LABELS[role]}</span>
        </div>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> 사용자 화면으로
        </Link>
      </div>
    </aside>
  )
}
