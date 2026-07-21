"use client"

import { useState } from "react"
import { Menu, Zap } from "lucide-react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import type { UserRole } from "@/lib/auth/permissions"

export function AdminShell({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 md:pl-64">
      {/* 모바일 상단바 — 데스크톱에선 고정 사이드바가 이미 보이므로 숨김 */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-[#1e3a5f] text-white">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold">관리자</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="관리자 메뉴 열기"
          className="p-1.5 -mr-1.5"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* 모바일 오버레이 사이드바 */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 md:hidden">
            <AdminSidebar role={role} mobile onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* 데스크톱 고정 사이드바 */}
      <AdminSidebar role={role} />

      <main className="p-4 md:p-8 overflow-auto">{children}</main>
    </div>
  )
}
