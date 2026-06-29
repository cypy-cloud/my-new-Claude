"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, MessageSquare, BookOpen, FileText, MoreHorizontal } from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard", label: "홈", icon: LayoutDashboard },
  { href: "/ai-message", label: "AI 문자", icon: MessageSquare },
  { href: "/ai-script", label: "스크립트", icon: BookOpen },
  { href: "/ai-document", label: "PDF 분석", icon: FileText },
  { href: "/my-results", label: "보관함", icon: MoreHorizontal },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
      <div className="grid grid-cols-5 h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                isActive ? "text-[#1e3a5f]" : "text-gray-400"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-orange-500")} />
              <span className={cn("font-medium", isActive && "text-[#1e3a5f]")}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
