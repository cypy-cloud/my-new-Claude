"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Users, Search, Loader2, ShieldCheck, Crown, Shield,
  ChevronDown, ChevronUp, Ban, BarChart2, X
} from "lucide-react"
import { toast } from "sonner"
import type { UserRole } from "@/lib/auth/permissions"
import { PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"

interface UserRow {
  id: string
  full_name: string | null
  email: string
  plan_type: PlanId
  role: UserRole
  status: string
  created_at: string
  company_name: string | null
  branch_name: string | null
}

interface UsageRow {
  usage_month: string
  sms_count: number
  script_count: number
  followup_count: number
  pdf_upload_count: number
  pdf_analysis_count: number
  ai_cost_estimate: number
}

interface RestrictionRow {
  id: string
  feature: string
  reason: string | null
  expires_at: string | null
  created_at: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  user: '일반', manager: '매니저', admin: '관리자', super_admin: '슈퍼관리자',
}
const ROLE_STYLES: Record<UserRole, string> = {
  user: 'bg-gray-100 text-gray-700', manager: 'bg-blue-100 text-blue-700',
  admin: 'bg-purple-100 text-purple-700', super_admin: 'bg-orange-100 text-orange-700',
}
const ROLE_ICONS: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  user: Users, manager: Shield, admin: ShieldCheck, super_admin: Crown,
}
const PLAN_STYLES: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700', basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-[#1e3a5f] text-white', premium: 'bg-orange-500 text-white',
}
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700', suspended: 'bg-yellow-100 text-yellow-700',
  deleted: 'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = { active: '활성', suspended: '정지', deleted: '삭제' }
const ALL_ROLES: UserRole[] = ['user', 'manager', 'admin', 'super_admin']
const ALL_PLANS: PlanId[] = ['free', 'basic', 'pro', 'premium']
const ALL_STATUSES = ['active', 'suspended', 'deleted']
const FEATURE_LABELS: Record<string, string> = {
  all: '전체 기능', ai_message: 'AI 문자', ai_script: 'AI 스크립트',
  ai_document: 'AI 문서', ai_followup: 'AI 팔로업',
}

interface Props { callerRole: UserRole }

export function AdminUsersClient({ callerRole }: Props) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [offset, setOffset] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [usageMap, setUsageMap] = useState<Record<string, UsageRow[]>>({})
  const [restrictMap, setRestrictionMap] = useState<Record<string, RestrictionRow[]>>({})
  const [usageLoading, setUsageLoading] = useState<string | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const isSuperAdmin = callerRole === 'super_admin'

  const LIMIT = 20

  async function load(newOffset = 0) {
    setLoading(true)
    const params = new URLSearchParams()
    if (planFilter) params.set('plan', planFilter)
    if (roleFilter) params.set('role', roleFilter)
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('search', search)
    params.set('limit', String(LIMIT))
    params.set('offset', String(newOffset))
    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    setUsers(data.users ?? [])
    setTotal(data.total ?? 0)
    setOffset(newOffset)
    setLoading(false)
  }

  useEffect(() => { load(0) }, [planFilter, roleFilter, statusFilter]) // eslint-disable-line

  async function toggleExpand(userId: string) {
    if (expandedId === userId) { setExpandedId(null); return }
    setExpandedId(userId)
    if (!usageMap[userId]) {
      setUsageLoading(userId)
      const [uRes, rRes] = await Promise.all([
        fetch(`/api/admin/users/usage?userId=${userId}`),
        fetch(`/api/admin/users/restrict?userId=${userId}`),
      ])
      const uData = await uRes.json()
      const rData = await rRes.json()
      setUsageMap(prev => ({ ...prev, [userId]: uData.usage ?? [] }))
      setRestrictionMap(prev => ({ ...prev, [userId]: rData.restrictions ?? [] }))
      setUsageLoading(null)
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setChangingRole(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? '변경 실패'); return }
      toast.success(`역할이 ${ROLE_LABELS[newRole]}로 변경되었습니다`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } finally { setChangingRole(null) }
  }

  async function handleStatusChange(userId: string, newStatus: string) {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId, status: newStatus }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? '변경 실패'); return }
    toast.success(`상태가 ${STATUS_LABELS[newStatus]}로 변경되었습니다`)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
  }

  async function handlePlanChange(userId: string, planId: PlanId) {
    const res = await fetch('/api/admin/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId, planId }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? '변경 실패'); return }
    toast.success(`${PLAN_LABELS[planId]} 플랜으로 변경되었습니다`)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan_type: planId } : u))
  }

  async function handleUsageAdjust(userId: string, feature: string, delta: number, reason: string) {
    const res = await fetch('/api/admin/users/usage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId, feature, delta, reason }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? '조정 실패'); return }
    toast.success('사용량이 조정되었습니다')
    const uRes = await fetch(`/api/admin/users/usage?userId=${userId}`)
    const uData = await uRes.json()
    setUsageMap(prev => ({ ...prev, [userId]: uData.usage ?? [] }))
  }

  async function handleAddRestriction(userId: string, feature: string, reason: string) {
    const res = await fetch('/api/admin/users/restrict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId, feature, reason }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? '제한 설정 실패'); return }
    toast.success('기능 제한이 설정되었습니다')
    const rRes = await fetch(`/api/admin/users/restrict?userId=${userId}`)
    const rData = await rRes.json()
    setRestrictionMap(prev => ({ ...prev, [userId]: rData.restrictions ?? [] }))
  }

  async function handleRemoveRestriction(userId: string, feature: string) {
    const res = await fetch(`/api/admin/users/restrict?userId=${userId}&feature=${feature}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('제한 해제 실패'); return }
    toast.success('기능 제한이 해제되었습니다')
    setRestrictionMap(prev => ({ ...prev, [userId]: (prev[userId] ?? []).filter(r => r.feature !== feature) }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <Users className="h-5 w-5" /> 회원 관리
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">전체 {total}명 · 역할/상태/플랜/사용량/제한 관리</p>
        </div>
        <Badge className="bg-purple-100 text-purple-700 text-xs">{ROLE_LABELS[callerRole]}</Badge>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="이메일, 이름, 회사 검색..." value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(0)}
            className="pl-9" />
        </div>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white">
          <option value="">전체 플랜</option>
          {ALL_PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white">
          <option value="">전체 역할</option>
          {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white">
          <option value="">전체 상태</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <Button variant="outline" onClick={() => load(0)} className="shrink-0">검색</Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">회원 목록 ({total}명)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">검색 결과가 없습니다</div>
          ) : (
            <div className="divide-y">
              {users.map(u => {
                const RoleIcon = ROLE_ICONS[u.role]
                const isExpanded = expandedId === u.id
                return (
                  <div key={u.id}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                      <div className="w-9 h-9 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {(u.full_name ?? u.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-800">{u.full_name ?? '(이름 없음)'}</span>
                          <span className="text-xs text-gray-500">{u.email}</span>
                          {u.company_name && <span className="text-xs text-gray-400">{u.company_name}</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          가입: {new Date(u.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>

                      {/* 상태 변경 */}
                      <select value={u.status} onChange={e => handleStatusChange(u.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_STYLES[u.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>

                      {/* 플랜 변경 */}
                      <select value={u.plan_type} onChange={e => handlePlanChange(u.id, e.target.value as PlanId)}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${PLAN_STYLES[u.plan_type]}`}>
                        {ALL_PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                      </select>

                      {/* 역할 변경 */}
                      {isSuperAdmin ? (
                        changingRole === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : (
                          <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                            className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${ROLE_STYLES[u.role]}`}>
                            {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        )
                      ) : (
                        <Badge className={`text-xs flex items-center gap-1 ${ROLE_STYLES[u.role]}`}>
                          <RoleIcon className="h-3 w-3" />{ROLE_LABELS[u.role]}
                        </Badge>
                      )}

                      <Button variant="ghost" size="sm" onClick={() => toggleExpand(u.id)} className="text-gray-400 p-1">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* 확장 패널: 사용량 + 기능 제한 */}
                    {isExpanded && (
                      <div className="bg-gray-50 px-6 py-4 border-t space-y-4">
                        {usageLoading === u.id ? (
                          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                        ) : (
                          <>
                            {/* 사용량 조회 + 조정 */}
                            <UsagePanel userId={u.id} usage={usageMap[u.id] ?? []} onAdjust={handleUsageAdjust} />
                            {/* 기능 제한 */}
                            <RestrictionPanel userId={u.id} restrictions={restrictMap[u.id] ?? []}
                              onAdd={handleAddRestriction} onRemove={handleRemoveRestriction} />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* 페이지네이션 */}
          {total > LIMIT && (
            <div className="flex justify-center gap-2 py-4 border-t">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => load(offset - LIMIT)}>이전</Button>
              <span className="text-sm text-gray-500 self-center">{Math.floor(offset / LIMIT) + 1} / {Math.ceil(total / LIMIT)}</span>
              <Button variant="outline" size="sm" disabled={offset + LIMIT >= total} onClick={() => load(offset + LIMIT)}>다음</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 사용량 패널
const USAGE_FEATURES = [
  { key: 'sms_count', label: 'AI 문자' },
  { key: 'script_count', label: 'AI 스크립트' },
  { key: 'followup_count', label: '팔로업' },
  { key: 'pdf_upload_count', label: 'PDF 업로드' },
  { key: 'pdf_analysis_count', label: 'PDF 분석' },
]

function UsagePanel({ userId, usage, onAdjust }: {
  userId: string
  usage: UsageRow[]
  onAdjust: (userId: string, feature: string, delta: number, reason: string) => void
}) {
  const [selFeature, setSelFeature] = useState('sms_count')
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const current = usage[0]

  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1"><BarChart2 className="h-3.5 w-3.5" /> 사용량 (이번 달)</p>
      {current ? (
        <div className="grid grid-cols-5 gap-2 mb-3">
          {USAGE_FEATURES.map(f => (
            <div key={f.key} className="text-center bg-white rounded-lg p-2 shadow-sm">
              <div className="text-lg font-bold text-[#1e3a5f]">{(current as any)[f.key] ?? 0}</div>
              <div className="text-xs text-gray-500">{f.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-3">이번 달 사용 기록 없음</p>
      )}
      <div className="flex gap-2 flex-wrap">
        <select value={selFeature} onChange={e => setSelFeature(e.target.value)}
          className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
          {USAGE_FEATURES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <Input placeholder="조정값 (예: +5, -2)" value={delta} onChange={e => setDelta(e.target.value)}
          className="w-32 h-7 text-xs" />
        <Input placeholder="사유 (선택)" value={reason} onChange={e => setReason(e.target.value)}
          className="w-40 h-7 text-xs" />
        <Button size="sm" className="h-7 text-xs" onClick={() => {
          const n = parseInt(delta)
          if (isNaN(n)) { toast.error('숫자를 입력하세요'); return }
          onAdjust(userId, selFeature, n, reason)
          setDelta(''); setReason('')
        }}>적용</Button>
      </div>
    </div>
  )
}

// 기능 제한 패널
function RestrictionPanel({ userId, restrictions, onAdd, onRemove }: {
  userId: string
  restrictions: RestrictionRow[]
  onAdd: (userId: string, feature: string, reason: string) => void
  onRemove: (userId: string, feature: string) => void
}) {
  const [selFeature, setSelFeature] = useState('all')
  const [reason, setReason] = useState('')

  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1"><Ban className="h-3.5 w-3.5" /> 기능 제한</p>
      {restrictions.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-2">
          {restrictions.map(r => (
            <div key={r.id} className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-1 rounded-full">
              <Ban className="h-3 w-3" />
              {FEATURE_LABELS[r.feature] ?? r.feature}
              {r.reason && <span className="text-red-400">({r.reason})</span>}
              <button onClick={() => onRemove(userId, r.feature)} className="ml-1 hover:text-red-900">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-2">제한 없음</p>
      )}
      <div className="flex gap-2 flex-wrap">
        <select value={selFeature} onChange={e => setSelFeature(e.target.value)}
          className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
          {Object.entries(FEATURE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Input placeholder="제한 사유 (선택)" value={reason} onChange={e => setReason(e.target.value)}
          className="w-40 h-7 text-xs" />
        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => {
          onAdd(userId, selFeature, reason)
          setReason('')
        }}>제한 추가</Button>
      </div>
    </div>
  )
}
