"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Plus, ChevronLeft, ChevronRight, Calendar, CheckCircle2,
  Circle, XCircle, Clock, User, AlertTriangle, Phone,
  MessageSquare, Trash2, Pencil, X, Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerRef { id: string; name: string; phone: string }

interface Task {
  id: string
  customer_id: string | null
  title: string
  description: string | null
  task_type: TaskType
  due_date: string
  due_time: string | null
  status: Status
  priority: Priority
  customers?: CustomerRef | null
}

type TaskType = 'followup' | 'meeting' | 'birthday' | 'renewal' | 'review' | 'other'
type Status   = 'pending' | 'completed' | 'canceled'
type Priority = 'low' | 'medium' | 'high'
type ViewMode = 'today' | 'week' | 'month'

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<TaskType, { label: string; color: string; dot: string }> = {
  followup: { label: "후속 연락",   color: "bg-blue-100 text-blue-700 border-blue-200",   dot: "bg-blue-500" },
  meeting:  { label: "상담 예정",   color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  birthday: { label: "고객 생일",   color: "bg-pink-100 text-pink-700 border-pink-200",    dot: "bg-pink-500" },
  renewal:  { label: "계약 갱신",   color: "bg-red-100 text-red-700 border-red-200",       dot: "bg-red-500" },
  review:   { label: "보험 점검",   color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  other:    { label: "기타",         color: "bg-gray-100 text-gray-700 border-gray-200",    dot: "bg-gray-400" },
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  high:   { label: "높음", color: "text-red-600" },
  medium: { label: "보통", color: "text-yellow-600" },
  low:    { label: "낮음", color: "text-gray-400" },
}

const STATUS_ICON: Record<Status, React.ElementType> = {
  pending:   Circle,
  completed: CheckCircle2,
  canceled:  XCircle,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(date: Date): string {
  return date.toLocaleDateString('sv-SE') // YYYY-MM-DD
}

function today(): string { return toLocalDateStr(new Date()) }

function getWeekRange(base: Date): { from: string; to: string } {
  const d = new Date(base)
  const day = d.getDay()
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { from: toLocalDateStr(mon), to: toLocalDateStr(sun) }
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Fill leading blanks (Mon-based)
  const startDow = (firstDay.getDay() + 6) % 7
  for (let i = 0; i < startDow; i++) days.push(new Date(year, month, 1 - startDow + i))
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
  // Fill trailing blanks to complete rows
  while (days.length % 7 !== 0) days.push(new Date(year, month + 1, days.length - lastDay.getDate() - startDow + 1))
  return days
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

function isOverdue(task: Task): boolean {
  return task.status === 'pending' && task.due_date < today()
}

// ─── Task Form Modal ──────────────────────────────────────────────────────────

interface FormData {
  title: string; description: string; task_type: TaskType
  due_date: string; due_time: string; priority: Priority; customer_id: string
}

const DEFAULT_FORM: FormData = {
  title: '', description: '', task_type: 'followup',
  due_date: today(), due_time: '', priority: 'medium', customer_id: '',
}

function TaskFormModal({
  initial, customers, onSave, onClose,
}: {
  initial?: Partial<FormData> & { id?: string }
  customers: CustomerRef[]
  onSave: (data: FormData & { id?: string }) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<FormData>({ ...DEFAULT_FORM, ...initial })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error("제목을 입력해주세요"); return }
    if (!form.due_date) { toast.error("날짜를 선택해주세요"); return }
    setSaving(true)
    try { await onSave({ ...form, id: initial?.id }) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg">{initial?.id ? "일정 수정" : "새 일정 등록"}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <Label>제목 <span className="text-red-500">*</span></Label>
            <Input placeholder="예: 김철수 고객 갱신 상담" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>업무 유형 <span className="text-red-500">*</span></Label>
              <select value={form.task_type} onChange={e => set('task_type', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                {(Object.entries(TYPE_CONFIG) as [TaskType, typeof TYPE_CONFIG[TaskType]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>우선순위</Label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>날짜 <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>시간 (선택)</Label>
              <Input type="time" value={form.due_time} onChange={e => set('due_time', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>연결 고객 (선택)</Label>
            <select value={form.customer_id} onChange={e => set('customer_id', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <option value="">고객 미연결</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>메모</Label>
            <Textarea placeholder="상담 내용, 준비사항 등" value={form.description}
              onChange={e => set('description', e.target.value)} rows={3} />
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
          <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? "저장 중..." : initial?.id ? "수정 완료" : "등록"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task, onStatusChange, onEdit, onDelete, onFollowup,
}: {
  task: Task
  onStatusChange: (id: string, status: Status) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onFollowup: (task: Task) => void
}) {
  const router = useRouter()
  const type = TYPE_CONFIG[task.task_type]
  const StatusIcon = STATUS_ICON[task.status]
  const overdue = isOverdue(task)

  return (
    <div className={cn(
      "bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow",
      task.status === 'completed' && "opacity-60",
      overdue && "border-red-200 bg-red-50/30"
    )}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onStatusChange(task.id, task.status === 'pending' ? 'completed' : 'pending')}
          className="mt-0.5 flex-shrink-0"
        >
          <StatusIcon className={cn("h-5 w-5", task.status === 'completed' ? "text-green-500" : task.status === 'canceled' ? "text-gray-400" : overdue ? "text-red-400" : "text-gray-300")} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn("text-sm font-medium", task.status === 'completed' && "line-through text-gray-400")}>
              {task.title}
            </span>
            {overdue && <span className="text-xs text-red-600 font-semibold">지연</span>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-xs", type.color)}>{type.label}</Badge>
            <span className={cn("text-xs font-medium", PRIORITY_CONFIG[task.priority].color)}>
              {PRIORITY_CONFIG[task.priority].label}
            </span>
            {task.due_time && (
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <Clock className="h-3 w-3" />{task.due_time.slice(0, 5)}
              </span>
            )}
            {task.customers && (
              <button
                onClick={() => router.push(`/customers/${task.customer_id}`)}
                className="text-xs text-blue-600 flex items-center gap-0.5 hover:underline"
              >
                <User className="h-3 w-3" />{task.customers.name}
              </button>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {task.customers && task.task_type === 'followup' && (
            <button onClick={() => onFollowup(task)} title="후속 문자 생성"
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          )}
          {task.customers?.phone && (
            <a href={`tel:${task.customers.phone}`} title="전화하기"
              className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition-colors">
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
          <button onClick={() => onEdit(task)} title="수정"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(task.id)} title="삭제"
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Month Calendar View ──────────────────────────────────────────────────────

function MonthView({
  year, month, tasks, onDayClick, onTaskClick,
}: {
  year: number; month: number
  tasks: Task[]
  onDayClick: (date: string) => void
  onTaskClick: (task: Task) => void
}) {
  const days = getDaysInMonth(year, month)
  const todayStr = today()
  const tasksByDate: Record<string, Task[]> = {}
  for (const t of tasks) {
    if (!tasksByDate[t.due_date]) tasksByDate[t.due_date] = []
    tasksByDate[t.due_date].push(t)
  }
  const DOW = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 border-b">
        {DOW.map(d => (
          <div key={d} className={cn("text-center text-xs font-semibold py-2",
            d === '토' ? "text-blue-500" : d === '일' ? "text-red-500" : "text-gray-500")}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, idx) => {
          const dateStr = toLocalDateStr(date)
          const isThisMonth = date.getMonth() === month
          const isToday = dateStr === todayStr
          const dayTasks = tasksByDate[dateStr] ?? []
          const dow = (date.getDay() + 6) % 7 // 0=Mon

          return (
            <div
              key={idx}
              onClick={() => onDayClick(dateStr)}
              className={cn(
                "min-h-[90px] p-1.5 border-b border-r cursor-pointer hover:bg-orange-50/50 transition-colors",
                !isThisMonth && "bg-gray-50",
                isToday && "bg-orange-50"
              )}
            >
              <span className={cn(
                "text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full",
                !isThisMonth ? "text-gray-300" : dow === 6 ? "text-red-500" : dow === 5 ? "text-blue-500" : "text-gray-700",
                isToday && "bg-orange-500 text-white"
              )}>
                {date.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayTasks.slice(0, 3).map(t => (
                  <div
                    key={t.id}
                    onClick={e => { e.stopPropagation(); onTaskClick(t) }}
                    className={cn(
                      "text-xs px-1 py-0.5 rounded truncate cursor-pointer",
                      TYPE_CONFIG[t.task_type].dot.replace('bg-', 'bg-') + "/20",
                      t.status === 'completed' && "opacity-50 line-through"
                    )}
                    style={{ backgroundColor: getTypeColor(t.task_type) }}
                  >
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-gray-400 px-1">+{dayTasks.length - 3}개</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getTypeColor(type: TaskType): string {
  const map: Record<TaskType, string> = {
    followup: '#dbeafe', meeting: '#ffedd5', birthday: '#fce7f3',
    renewal: '#fee2e2', review: '#f3e8ff', other: '#f3f4f6',
  }
  return map[type]
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [customers, setCustomers] = useState<CustomerRef[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('week')
  const [calDate, setCalDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Derive date range from view
  const dateRange = (() => {
    if (view === 'today') return { from: today(), to: today() }
    if (view === 'week') return getWeekRange(calDate)
    return getMonthRange(calDate.getFullYear(), calDate.getMonth())
  })()

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from: dateRange.from, to: dateRange.to })
      const res = await fetch(`/api/tasks?${params}`)
      const data = await res.json()
      if (res.ok) setTasks(data.tasks ?? [])
    } catch { toast.error("일정을 불러오지 못했습니다") }
    finally { setLoading(false) }
  }, [dateRange.from, dateRange.to])

  useEffect(() => { loadTasks() }, [loadTasks])

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(d => setCustomers(d.customers ?? []))
      .catch(() => {})
  }, [])

  const navigate = (dir: number) => {
    const d = new Date(calDate)
    if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else if (view === 'month') d.setMonth(d.getMonth() + dir)
    else d.setDate(d.getDate() + dir)
    setCalDate(d)
  }

  const handleSave = async (formData: FormData & { id?: string }) => {
    const { id, ...body } = formData
    const method = id ? 'PATCH' : 'POST'
    const url = id ? `/api/tasks/${id}` : '/api/tasks'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? "저장에 실패했습니다"); return }
    toast.success(id ? "수정되었습니다" : "일정이 등록되었습니다")
    setShowForm(false)
    setEditingTask(null)
    loadTasks()
  }

  const handleStatusChange = async (id: string, status: Status) => {
    const res = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    if (!res.ok) { toast.error("상태 변경에 실패했습니다"); return }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  const handleDelete = async (id: string) => {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error("삭제에 실패했습니다"); return }
    toast.success("삭제되었습니다")
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const handleFollowup = (task: Task) => {
    const params = new URLSearchParams({
      purpose: `후속 연락: ${task.title}`,
      ...(task.customers ? { customer: task.customers.name } : {}),
    })
    router.push(`/ai-message?${params}`)
  }

  const handleDayClick = (date: string) => {
    setSelectedDate(date)
    setShowForm(true)
  }

  const handleTaskClick = (task: Task) => {
    setEditingTask(task)
    setShowForm(true)
  }

  // Derived stats for today
  const todayTasks = tasks.filter(t => t.due_date === today())
  const pendingToday = todayTasks.filter(t => t.status === 'pending').length
  const overdueAll = tasks.filter(isOverdue)

  // View label
  const viewLabel = (() => {
    if (view === 'today') return `오늘 (${formatDate(today())})`
    if (view === 'week') return `${formatDate(dateRange.from)} ~ ${formatDate(dateRange.to)}`
    return `${calDate.getFullYear()}년 ${calDate.getMonth() + 1}월`
  })()

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">업무 캘린더</h1>
          <p className="text-sm text-gray-500 mt-0.5">상담·후속연락·갱신·생일 등 업무 일정을 관리합니다</p>
        </div>
        <Button onClick={() => { setEditingTask(null); setSelectedDate(today()); setShowForm(true) }}
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
          <Plus className="h-4 w-4" /> 새 일정
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">오늘 할 일</p>
          <p className="text-2xl font-bold text-gray-900">{pendingToday}<span className="text-sm font-normal text-gray-400 ml-1">건</span></p>
        </div>
        <div className={cn("border rounded-xl p-4", overdueAll.length > 0 ? "bg-red-50 border-red-200" : "bg-white")}>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            {overdueAll.length > 0 && <AlertTriangle className="h-3 w-3 text-red-500" />}
            지연된 일정
          </p>
          <p className={cn("text-2xl font-bold", overdueAll.length > 0 ? "text-red-600" : "text-gray-900")}>
            {overdueAll.length}<span className="text-sm font-normal text-gray-400 ml-1">건</span>
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">완료</p>
          <p className="text-2xl font-bold text-green-600">{completedTasks.length}<span className="text-sm font-normal text-gray-400 ml-1">건</span></p>
        </div>
      </div>

      {/* View switcher + Nav */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-xl border bg-white p-1 gap-1">
          {(['today', 'week', 'month'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => { setView(v); setCalDate(new Date()) }}
              className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                view === v ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-100")}>
              {v === 'today' ? '오늘' : v === 'week' ? '주간' : '월간'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {view !== 'today' && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium text-gray-700 min-w-0 text-center">{viewLabel}</span>
              <Button variant="outline" size="sm" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
            </>
          )}
          {view === 'today' && <span className="text-sm font-medium text-gray-700">{viewLabel}</span>}
        </div>
      </div>

      {/* Month calendar grid */}
      {view === 'month' && (
        <MonthView
          year={calDate.getFullYear()}
          month={calDate.getMonth()}
          tasks={tasks}
          onDayClick={handleDayClick}
          onTaskClick={handleTaskClick}
        />
      )}

      {/* Task list (today / week / month detail) */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-xl text-gray-400">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">이 기간에 등록된 일정이 없습니다</p>
            <Button variant="outline" size="sm" className="mt-3"
              onClick={() => { setEditingTask(null); setSelectedDate(dateRange.from); setShowForm(true) }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> 일정 추가
            </Button>
          </div>
        ) : (
          <>
            {/* Overdue section */}
            {overdueAll.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-red-600 flex items-center gap-1 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> 지연된 일정 ({overdueAll.length}건)
                </h3>
                <div className="space-y-2">
                  {overdueAll.map(t => (
                    <TaskCard key={t.id} task={t}
                      onStatusChange={handleStatusChange} onEdit={() => { setEditingTask(t); setShowForm(true) }}
                      onDelete={handleDelete} onFollowup={handleFollowup} />
                  ))}
                </div>
              </div>
            )}

            {/* Group by date for week/month list */}
            {view !== 'today' ? (() => {
              const nonOverdue = pendingTasks.filter(t => !isOverdue(t))
              const byDate: Record<string, Task[]> = {}
              for (const t of nonOverdue) {
                if (!byDate[t.due_date]) byDate[t.due_date] = []
                byDate[t.due_date].push(t)
              }
              return (
                <>
                  {Object.entries(byDate).sort().map(([date, dayTasks]) => (
                    <div key={date}>
                      <h3 className={cn("text-xs font-semibold mb-2 flex items-center gap-1",
                        date === today() ? "text-orange-600" : "text-gray-500")}>
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(date)} {date === today() && <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">오늘</span>}
                      </h3>
                      <div className="space-y-2">
                        {dayTasks.map(t => (
                          <TaskCard key={t.id} task={t}
                            onStatusChange={handleStatusChange} onEdit={() => { setEditingTask(t); setShowForm(true) }}
                            onDelete={handleDelete} onFollowup={handleFollowup} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {completedTasks.length > 0 && (
                    <details className="group">
                      <summary className="text-xs font-semibold text-gray-400 cursor-pointer flex items-center gap-1 mb-2 list-none">
                        <Check className="h-3.5 w-3.5" /> 완료된 일정 ({completedTasks.length}건)
                      </summary>
                      <div className="space-y-2 mt-2">
                        {completedTasks.map(t => (
                          <TaskCard key={t.id} task={t}
                            onStatusChange={handleStatusChange} onEdit={() => { setEditingTask(t); setShowForm(true) }}
                            onDelete={handleDelete} onFollowup={handleFollowup} />
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )
            })() : (
              // Today view: flat list
              <div className="space-y-2">
                {pendingTasks.map(t => (
                  <TaskCard key={t.id} task={t}
                    onStatusChange={handleStatusChange} onEdit={() => { setEditingTask(t); setShowForm(true) }}
                    onDelete={handleDelete} onFollowup={handleFollowup} />
                ))}
                {completedTasks.map(t => (
                  <TaskCard key={t.id} task={t}
                    onStatusChange={handleStatusChange} onEdit={() => { setEditingTask(t); setShowForm(true) }}
                    onDelete={handleDelete} onFollowup={handleFollowup} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <TaskFormModal
          customers={customers}
          initial={editingTask ? {
            id: editingTask.id,
            title: editingTask.title,
            description: editingTask.description ?? '',
            task_type: editingTask.task_type,
            due_date: editingTask.due_date,
            due_time: editingTask.due_time ?? '',
            priority: editingTask.priority,
            customer_id: editingTask.customer_id ?? '',
          } : selectedDate ? { due_date: selectedDate } : undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingTask(null); setSelectedDate(null) }}
        />
      )}
    </div>
  )
}
