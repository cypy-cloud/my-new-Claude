"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, Megaphone, Info, Wrench, Sparkles, Pin, ChevronDown, ChevronUp, Loader2 } from "lucide-react"

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  target_plan: string
  is_pinned: boolean
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  isRead: boolean
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; badge: string }> = {
  feature:     { label: '새 기능',  icon: Sparkles, badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  info:        { label: '안내',     icon: Info,     badge: 'bg-gray-100 text-gray-700 border-gray-200' },
  maintenance: { label: '점검',     icon: Wrench,   badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  warning:     { label: '중요',     icon: Megaphone, badge: 'bg-red-100 text-red-700 border-red-200' },
}

const PLAN_LABELS: Record<string, string> = {
  all: '전체', free: '무료', basic: '기본', pro: '프로', premium: '프리미엄'
}

export function NoticesList() {
  const [notices, setNotices] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/announcements?limit=30')
      .then(r => r.json())
      .then(d => setNotices(d.announcements ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function toggleExpand(id: string) {
    const next = expandedId === id ? null : id
    setExpandedId(next)
    if (next) {
      const notice = notices.find(n => n.id === next)
      if (notice && !notice.isRead) {
        await fetch('/api/announcements/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcementId: id }),
        }).catch(() => {})
        setNotices(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      }
    }
  }

  const pinned = notices.filter(n => n.is_pinned)
  const normal = notices.filter(n => !n.is_pinned)

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
  )

  if (notices.length === 0) return (
    <div className="flex flex-col items-center py-20 text-gray-400 gap-3">
      <Bell className="h-10 w-10 text-gray-200" />
      <p>공지사항이 없습니다</p>
    </div>
  )

  const renderNotice = (notice: Announcement) => {
    const cfg = TYPE_CONFIG[notice.type] ?? TYPE_CONFIG.info
    const Icon = cfg.icon
    const isExpanded = expandedId === notice.id

    return (
      <Card key={notice.id} className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${!notice.isRead ? 'ring-1 ring-blue-100' : ''}`}>
        <CardContent className="p-0">
          <div className="flex items-start gap-3 p-4" onClick={() => toggleExpand(notice.id)}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              notice.type === 'warning' ? 'bg-red-100 text-red-500' :
              notice.type === 'feature' ? 'bg-blue-100 text-blue-600' :
              notice.type === 'maintenance' ? 'bg-orange-100 text-orange-500' :
              'bg-gray-100 text-gray-500'
            }`}>
              <Icon className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {notice.is_pinned && (
                  <span className="flex items-center gap-0.5 text-xs text-orange-500 font-medium">
                    <Pin className="h-3 w-3" /> 고정
                  </span>
                )}
                <Badge className={`text-xs border ${cfg.badge}`}>{cfg.label}</Badge>
                {notice.target_plan !== 'all' && (
                  <Badge className="text-xs bg-purple-50 text-purple-600 border-purple-100">
                    {PLAN_LABELS[notice.target_plan]} 전용
                  </Badge>
                )}
                {!notice.isRead && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                )}
              </div>
              <p className={`text-sm font-medium ${notice.is_pinned ? 'text-[#1e3a5f]' : 'text-gray-800'}`}>
                {notice.title}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(notice.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>

            <div className="shrink-0 text-gray-400">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>

          {isExpanded && (
            <div className="px-4 pb-4 pt-0 border-t border-gray-50">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line mt-3">
                {notice.content}
              </p>
              {notice.ends_at && (
                <p className="text-xs text-gray-400 mt-3">
                  종료: {new Date(notice.ends_at).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {pinned.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Pin className="h-3.5 w-3.5" /> 고정 공지
          </h2>
          {pinned.map(renderNotice)}
        </div>
      )}
      {normal.length > 0 && (
        <div className="space-y-3">
          {pinned.length > 0 && (
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">일반 공지</h2>
          )}
          {normal.map(renderNotice)}
        </div>
      )}
    </div>
  )
}
