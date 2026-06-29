"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, MessageSquare, FileText, BookOpen, Settings, LogOut, Zap } from "lucide-react"
import type { Profile } from "@/types"

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/ai-message", label: "AI 문자/카톡", icon: MessageSquare },
  { href: "/ai-script", label: "AI 상담 스크립트", icon: BookOpen },
  { href: "/ai-document", label: "AI 설명자료", icon: FileText },
  { href: "/settings", label: "설정", icon: Settings },
]

interface SidebarProps {
  profile: Profile | null
  planName?: string
}

export function Sidebar({ profile, planName = "무료" }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("로그아웃 되었습니다.")
    router.push("/login")
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r">
      <div className="flex items-center h-16 px-6 border-b">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-lg text-gray-900">FP AI</span>
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}>
              <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-gray-400")} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-4 border-t">
        <div className="flex items-center space-x-3 px-3 py-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name ?? profile?.email ?? "사용자"}</p>
            <div className="flex items-center mt-0.5">
              <Badge variant="secondary" className="text-xs">{planName}</Badge>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-gray-600 hover:text-gray-900">
          <LogOut className="h-4 w-4 mr-2" />
          로그아웃
        </Button>
      </div>
    </aside>
  )
}
