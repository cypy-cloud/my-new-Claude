"use client"

import { useEffect, useState } from "react"
import { X, Megaphone, Info, Wrench, Sparkles, Pin } from "lucide-react"

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  is_pinned: boolean
  isRead: boolean
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  warning:     { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: Megaphone },
  info:        { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: Info },
  maintenance: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: Wrench },
  feature:     { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  icon: Sparkles },
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    // 고정 공지 + 안 읽은 공지만 배너로 표시
    fetch('/api/announcements?limit=5')
      .then(r => r.json())
      .then(d => {
        const list: Announcement[] = d.announcements ?? []
        // 고정 또는 안 읽음만 배너 노출
        setAnnouncements(list.filter(a => a.is_pinned || !a.isRead))
      })
      .catch(() => {})
  }, [])

  async function dismiss(id: string) {
    setDismissed(prev => new Set([...prev, id]))
    // 읽음 처리
    await fetch('/api/announcements/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcementId: id }),
    }).catch(() => {})
  }

  const visible = announcements.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  // 가장 중요한 공지 하나만 배너로 표시 (warning > pinned > 최신)
  const top = visible.find(a => a.type === 'warning') ?? visible.find(a => a.is_pinned) ?? visible[0]
  const style = TYPE_STYLES[top.type] ?? TYPE_STYLES.info
  const Icon = style.icon

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${style.bg} ${style.border} ${style.text} text-sm`}>
      <div className="flex items-center gap-1.5 shrink-0">
        {top.is_pinned && <Pin className="h-3.5 w-3.5" />}
        <Icon className="h-4 w-4" />
      </div>
      <p className="flex-1 font-medium">{top.title}</p>
      {visible.length > 1 && (
        <span className="text-xs opacity-70 shrink-0">외 {visible.length - 1}건</span>
      )}
      <button onClick={() => dismiss(top.id)} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
