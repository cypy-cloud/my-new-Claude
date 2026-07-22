"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Megaphone, Plus, Pencil, Trash2, Pin, PinOff,
  Eye, EyeOff, Loader2, X, Save, Bell
} from "lucide-react"
import { toast } from "sonner"
import { PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  target_plan: string
  target_role: string
  is_pinned: boolean
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
}

const TYPES = ['info', 'feature', 'warning', 'maintenance'] as const
const TYPE_LABELS: Record<string, string> = {
  info: '안내', feature: '새 기능', warning: '중요', maintenance: '점검'
}
const PLANS: PlanId[] = ['free', 'basic', 'pro', 'premium']
const ROLES = ['all', 'user', 'manager', 'admin'] as const
const ROLE_LABELS: Record<string, string> = { all: '전체', user: '일반', manager: '매니저', admin: '관리자' }

const DEFAULT_FORM = {
  title: '', content: '', type: 'info', targetPlan: 'all', targetRole: 'all',
  isPinned: false, isActive: true, startsAt: '', endsAt: '',
}

// 이메일/문자 푸시 placeholder (실제 구현은 추후)
async function sendPushNotification(_announcementId: string, _method: 'email' | 'sms') {
  // TODO: 이메일/문자 발송 연동 (Sendgrid, 네이버 클라우드 SMS 등)
  console.log('[Push placeholder] Push notification queued for', _method)
}

// DB에는 UTC ISO로 저장돼있는데 .slice(0,16)으로 그대로 datetime-local에 넣으면
// 로컬(KST) 시각으로 오인돼 9시간이 밀려 보이고, 그 상태로 다시 저장하면 실제
// 시각이 편집할 때마다 계속 어긋난다 — 로컬 타임존 기준으로 변환해서 넣어야 한다.
function toLocalDatetimeInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AdminAnnouncements() {
  const [list, setList] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/announcements')
    const data = await res.json()
    setList(data.announcements ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm(DEFAULT_FORM)
    setEditId(null)
    setShowForm(true)
  }

  function openEdit(a: Announcement) {
    setForm({
      title: a.title, content: a.content, type: a.type,
      targetPlan: a.target_plan, targetRole: a.target_role,
      isPinned: a.is_pinned, isActive: a.is_active,
      startsAt: a.starts_at ? toLocalDatetimeInputValue(a.starts_at) : '',
      endsAt: a.ends_at ? toLocalDatetimeInputValue(a.ends_at) : '',
    })
    setEditId(a.id)
    setShowForm(true)
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('제목과 내용을 입력해주세요')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    }
    const res = await fetch('/api/admin/announcements', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? '저장 실패'); setSaving(false); return }

    toast.success(editId ? '공지사항이 수정되었습니다' : '공지사항이 등록되었습니다')

    // 푸시 알림 placeholder
    if (!editId && data.id) {
      void sendPushNotification(data.id, 'email')
    }

    setShowForm(false)
    setEditId(null)
    await load()
    setSaving(false)
  }

  async function togglePin(a: Announcement) {
    await fetch('/api/admin/announcements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, isPinned: !a.is_pinned }),
    })
    setList(prev => prev.map(x => x.id === a.id ? { ...x, is_pinned: !a.is_pinned } : x))
    toast.success(a.is_pinned ? '고정 해제' : '고정 설정')
  }

  async function toggleActive(a: Announcement) {
    await fetch('/api/admin/announcements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, isActive: !a.is_active }),
    })
    setList(prev => prev.map(x => x.id === a.id ? { ...x, is_active: !a.is_active } : x))
    toast.success(a.is_active ? '비활성화 처리' : '활성화 처리')
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('공지사항을 삭제하시겠습니까?')) return
    setDeletingId(id)
    const res = await fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('삭제되었습니다')
      setList(prev => prev.filter(x => x.id !== id))
    } else {
      toast.error('삭제 실패')
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> 공지사항 관리
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">공지 작성·수정·삭제, 고정 및 대상 설정</p>
        </div>
        <Button className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> 공지 작성
        </Button>
      </div>

      {/* 작성/수정 폼 */}
      {showForm && (
        <Card className="border-2 border-[#1e3a5f]/20 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-[#1e3a5f]">
                {editId ? '공지사항 수정' : '새 공지사항 작성'}
              </CardTitle>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">유형</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">대상 요금제</label>
                <select value={form.targetPlan} onChange={e => setForm(f => ({ ...f, targetPlan: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="all">전체</option>
                  {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">대상 역할</label>
                <select value={form.targetRole} onChange={e => setForm(f => ({ ...f, targetRole: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">옵션</label>
                <div className="flex gap-3 mt-1">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} />
                    고정
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                    활성
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">게시 시작일 (선택)</label>
                <Input type="datetime-local" value={form.startsAt}
                  onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">게시 종료일 (선택)</label>
                <Input type="datetime-local" value={form.endsAt}
                  onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} className="text-sm" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">제목</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="공지 제목을 입력하세요" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">내용</label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="공지 내용을 입력하세요"
                rows={5}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
              />
            </div>

            {/* 푸시 알림 placeholder */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500">
              <Bell className="h-3.5 w-3.5 shrink-0" />
              이메일/문자 푸시 알림 기능은 준비 중입니다.{' '}
              {editId
                ? '앱 내 알림은 신규 등록 시에만 발송되며, 수정 시에는 다시 발송되지 않습니다.'
                : '공지 등록 시 대상(요금제/역할)에 맞는 사용자에게 앱 내 알림이 자동 발송됩니다.'}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>취소</Button>
              <Button className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                {editId ? '수정 저장' : '공지 등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 목록 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">공지 목록 ({list.length}건)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">공지사항이 없습니다</div>
          ) : (
            <div className="divide-y">
              {list.map(a => (
                <div key={a.id} className={`flex items-start gap-3 px-6 py-4 hover:bg-gray-50 ${!a.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {a.is_pinned && <Badge className="text-xs bg-orange-100 text-orange-600">📌 고정</Badge>}
                      <Badge className="text-xs bg-gray-100 text-gray-600">{TYPE_LABELS[a.type] ?? a.type}</Badge>
                      {a.target_plan !== 'all' && (
                        <Badge className="text-xs bg-purple-50 text-purple-600">
                          {PLAN_LABELS[a.target_plan as PlanId] ?? a.target_plan}
                        </Badge>
                      )}
                      {a.target_role !== 'all' && (
                        <Badge className="text-xs bg-blue-50 text-blue-600">{ROLE_LABELS[a.target_role]}</Badge>
                      )}
                      {!a.is_active && <Badge className="text-xs bg-gray-200 text-gray-500">비활성</Badge>}
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(a.created_at).toLocaleDateString('ko-KR')}
                      {a.ends_at && ` → ${new Date(a.ends_at).toLocaleDateString('ko-KR')} 까지`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button title={a.is_pinned ? '고정 해제' : '고정'} onClick={() => togglePin(a)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-orange-500">
                      {a.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </button>
                    <button title={a.is_active ? '비활성화' : '활성화'} onClick={() => toggleActive(a)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-500">
                      {a.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button title="수정" onClick={() => openEdit(a)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#1e3a5f]">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button title="삭제" onClick={() => deleteAnnouncement(a.id)} disabled={deletingId === a.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      {deletingId === a.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
