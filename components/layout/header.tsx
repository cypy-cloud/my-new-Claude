"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, Settings, ChevronDown } from "lucide-react"
import { PLAN_LABELS } from "@/types"
import type { Profile } from "@/types"
import { NotificationBell } from "@/components/notifications/notification-bell"

interface HeaderProps {
  profile: Profile | null
  planName?: string
  onMenuToggle?: () => void
  title?: string
}

export function Header({ profile, planName, onMenuToggle, title }: HeaderProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("로그아웃 되었습니다.")
    router.push("/login")
  }

  const displayPlanName = planName ?? PLAN_LABELS[profile?.plan_type ?? 'free'] ?? '무료'
  const displayName = profile?.name ?? profile?.email ?? "사용자"
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />

        <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-[#1e3a5f] flex items-center justify-center">
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900">{displayName}</span>
            <Badge variant="secondary" className="text-xs h-4">{displayPlanName}</Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-20 py-1">
              <div className="px-3 py-2 border-b">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
              </div>
              <Link
                href="/settings"
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings className="h-4 w-4" />
                <span>설정</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                <span>로그아웃</span>
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </header>
  )
}
