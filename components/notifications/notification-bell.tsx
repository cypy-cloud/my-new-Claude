"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check, CheckCheck, Megaphone, AlertTriangle, FileX2, CreditCard, Settings, Users, X } from "lucide-react"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  action_url: string | null
  created_at: string
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  announcement: { icon: Megaphone,      color: 'text-blue-500',   bg: 'bg-blue-50' },
  usage_limit:  { icon: AlertTriangle,  color: 'text-yellow-500', bg: 'bg-yellow-50' },
  file_delete:  { icon: FileX2,         color: 'text-orange-500', bg: 'bg-orange-50' },
  billing:      { icon: CreditCard,     color: 'text-green-500',  bg: 'bg-green-50' },
  system:       { icon: Settings,       color: 'text-gray-500',   bg: 'bg-gray-50' },
  team:         { icon: Users,          color: 'text-purple-500', bg: 'bg-purple-50' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  return `${Math.floor(hr / 24)}일 전`
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unreadCount ?? 0)
      }
    } catch {
      // 조용히 처리
    }
  }, [])

  // 초기 로드 + 60초 폴링
  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 60000)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  // 패널 외부 클릭 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function markAllRead() {
    setLoading(true)
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read-all' }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
    setLoading(false)
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.is_read) await markRead(n.id)
    if (n.action_url) {
      setOpen(false)
      router.push(n.action_url)
    }
  }

  return (
    <div ref={panelRef} className="relative">
      {/* 벨 아이콘 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
        aria-label="알림"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 패널 */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-800">알림</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  전체 읽음
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* 알림 목록 */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Bell className="h-8 w-8 mb-2 text-gray-200" />
                <p className="text-sm">새 알림이 없습니다</p>
              </div>
            ) : (
              <ul>
                {notifications.map(n => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system
                  const Icon = cfg.icon
                  return (
                    <li
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex gap-3 px-4 py-3 border-b last:border-0 cursor-pointer transition-colors ${
                        n.is_read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-tight ${n.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <button
                              onClick={async e => { e.stopPropagation(); await markRead(n.id) }}
                              className="shrink-0 mt-0.5"
                              title="읽음 처리"
                            >
                              <Check className="h-3.5 w-3.5 text-blue-400 hover:text-blue-600" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* 푸터 */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t bg-gray-50 text-center">
              <p className="text-xs text-gray-400">최근 알림 {notifications.length}개 표시</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
