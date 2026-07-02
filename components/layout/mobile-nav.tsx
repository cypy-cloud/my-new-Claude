"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, MessageSquare, FileText, BookOpen, Settings, LogOut, Zap, X, ShieldCheck } from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/ai-message", label: "AI 문자/카톡", icon: MessageSquare },
  { href: "/ai-script", label: "AI 상담 스크립트", icon: BookOpen },
  { href: "/objection-handler", label: "거절 극복 스크립트", icon: ShieldCheck },
  { href: "/ai-document", label: "AI 설명자료", icon: FileText },
  { href: "/settings", label: "설정", icon: Settings },
]

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("로그아웃 되었습니다.")
    onClose()
    router.push("/login")
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col md:hidden">
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center space-x-2">
            <Zap className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg text-gray-900">FP AI</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} onClick={onClose} className={cn(
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
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-gray-600">
            <LogOut className="h-4 w-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </div>
    </>
  )
}
