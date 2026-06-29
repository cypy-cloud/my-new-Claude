"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, Settings, ChevronDown } from "lucide-react"
import type { Profile } from "@/types"

interface HeaderProps {
  profile: Profile | null
  planName?: string
  onMenuToggle?: () => void
  title?: string
}

export function Header({ profile, planName = "무료", onMenuToggle, title }: HeaderProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("로그아웃 되었습니다.")
    router.push("/login")
  }

  const initials = profile?.full_name
    ? profile.full_name.slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() ?? "FP"

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
      </div>
      <div className="relative">
        <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900">{profile?.full_name ?? "사용자"}</span>
            <Badge variant="secondary" className="text-xs h-4">{planName}</Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>
        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-20 py-1">
              <div className="px-3 py-2 border-b">
                <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name ?? "사용자"}</p>
                <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
              </div>
              <Link href="/settings" className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setDropdownOpen(false)}>
                <Settings className="h-4 w-4" />
                <span>설정</span>
              </Link>
              <button onClick={handleLogout} className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left">
                <LogOut className="h-4 w-4" />
                <span>로그아웃</span>
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
