"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquareWarning, Loader2, Save, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import {
  FEEDBACK_CATEGORY_LABELS, FEEDBACK_STATUS_LABELS, FEEDBACK_PRIORITY_LABELS,
  type FeedbackCategory, type FeedbackStatus, type FeedbackPriority,
} from "@/types"

interface AdminFeedbackRow {
  id: string
  user_id: string
  category: FeedbackCategory
  title: string | null
  content: string
  status: FeedbackStatus
  priority: FeedbackPriority
  admin_memo: string | null
  created_at: string
  updated_at: string
  profile: { full_name: string | null; email: string } | null
}

const STATUSES: FeedbackStatus[] = ['open', 'reviewing', 'planned', 'resolved', 'closed']
const PRIORITIES: FeedbackPriority[] = ['low', 'medium', 'high']
const CATEGORIES = Object.keys(FEEDBACK_CATEGORY_LABELS) as FeedbackCategory[]

const STATUS_BADGE: Record<FeedbackStatus, string> = {
  open: "bg-gray-100 text-gray-600",
  reviewing: "bg-blue-100 text-blue-600",
  planned: "bg-purple-100 text-purple-600",
  resolved: "bg-green-100 text-green-600",
  closed: "bg-gray-200 text-gray-500",
}

const PRIORITY_BADGE: Record<FeedbackPriority, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-600",
}

export function AdminFeedback() {
  const [list, setList] = useState<AdminFeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (categoryFilter !== "all") params.set("category", categoryFilter)
    if (statusFilter !== "all") params.set("status", statusFilter)
    const res = await fetch(`/api/admin/feedback?${params.toString()}`)
    const data = await res.json()
    setList(data.feedback ?? [])
    setLoading(false)
  }, [categoryFilter, statusFilter])

  useEffect(() => { load() }, [load])

  async function updateFeedback(id: string, updates: { status?: FeedbackStatus; priority?: FeedbackPriority; adminMemo?: string }) {
    setSavingId(id)
    const res = await fetch('/api/admin/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? '저장 실패')
      setSavingId(null)
      return
    }
    setList(prev => prev.map(f => f.id === id ? {
      ...f,
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
      ...(updates.adminMemo !== undefined ? { admin_memo: updates.adminMemo } : {}),
    } : f))
    toast.success('저장되었습니다')
    setSavingId(null)
  }

  const counts = {
    open: list.filter(f => f.status === 'open').length,
    reviewing: list.filter(f => f.status === 'reviewing').length,
    planned: list.filter(f => f.status === 'planned').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
          <MessageSquareWarning className="h-5 w-5" /> 고객 피드백 관리
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">사용자 피드백 확인, 상태/우선순위 관리, 답변 메모 작성</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">{counts.open}</p>
          <p className="text-xs text-gray-400 mt-0.5">접수됨</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{counts.reviewing}</p>
          <p className="text-xs text-gray-400 mt-0.5">검토 중</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{counts.planned}</p>
          <p className="text-xs text-gray-400 mt-0.5">반영 예정</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="all">전체 카테고리</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{FEEDBACK_CATEGORY_LABELS[c]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="all">전체 상태</option>
          {STATUSES.map(s => <option key={s} value={s}>{FEEDBACK_STATUS_LABELS[s]}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '새로고침'}
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">피드백 목록 ({list.length}건)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">피드백이 없습니다</div>
          ) : (
            <div className="divide-y">
              {list.map(f => {
                const isOpen = expandedId === f.id
                const memo = memoDrafts[f.id] ?? f.admin_memo ?? ''
                return (
                  <div key={f.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isOpen ? null : f.id)}>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={`text-xs ${STATUS_BADGE[f.status]}`}>{FEEDBACK_STATUS_LABELS[f.status]}</Badge>
                          <Badge className={`text-xs ${PRIORITY_BADGE[f.priority]}`}>{FEEDBACK_PRIORITY_LABELS[f.priority]}</Badge>
                          <Badge className="text-xs bg-gray-50 text-gray-500 border border-gray-200">
                            {FEEDBACK_CATEGORY_LABELS[f.category]}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-800">
                          {f.title || f.content.slice(0, 40)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {f.profile?.full_name ?? f.profile?.email ?? '알 수 없음'} · {new Date(f.created_at).toLocaleString('ko-KR')}
                        </p>
                      </div>
                      <button onClick={() => setExpandedId(isOpen ? null : f.id)} className="p-1.5 text-gray-400 hover:text-gray-600 shrink-0">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="mt-4 pl-1 space-y-4">
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{f.content}</p>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">상태</label>
                            <select
                              value={f.status}
                              onChange={e => updateFeedback(f.id, { status: e.target.value as FeedbackStatus })}
                              disabled={savingId === f.id}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                            >
                              {STATUSES.map(s => <option key={s} value={s}>{FEEDBACK_STATUS_LABELS[s]}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">우선순위</label>
                            <select
                              value={f.priority}
                              onChange={e => updateFeedback(f.id, { priority: e.target.value as FeedbackPriority })}
                              disabled={savingId === f.id}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                            >
                              {PRIORITIES.map(p => <option key={p} value={p}>{FEEDBACK_PRIORITY_LABELS[p]}</option>)}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">관리자 메모</label>
                          <textarea
                            value={memo}
                            onChange={e => setMemoDrafts(prev => ({ ...prev, [f.id]: e.target.value }))}
                            placeholder="내부 검토 메모를 남겨주세요 (사용자에게는 보이지 않습니다)"
                            rows={3}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <Button
                              size="sm"
                              className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]"
                              disabled={savingId === f.id}
                              onClick={() => updateFeedback(f.id, { adminMemo: memo })}
                            >
                              {savingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                              메모 저장
                            </Button>
                            {f.status !== 'resolved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={savingId === f.id}
                                onClick={() => updateFeedback(f.id, { status: 'resolved' })}
                              >
                                해결 처리
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
