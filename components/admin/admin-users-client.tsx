"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Search, Loader2, ShieldCheck, Crown, Shield } from "lucide-react"
import { toast } from "sonner"
import type { UserRole } from "@/lib/auth/permissions"
import { PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"

interface UserRow {
  user_id: string
  name: string | null
  email: string
  plan_type: PlanId
  role: UserRole
  status: string
  created_at: string
  company_name: string | null
}

const ROLE_LABELS: Record<UserRole, string> = {
  user: '일반',
  manager: '매니저',
  admin: '관리자',
  super_admin: '슈퍼관리자',
}

const ROLE_STYLES: Record<UserRole, string> = {
  user: 'bg-gray-100 text-gray-700',
  manager: 'bg-blue-100 text-blue-700',
  admin: 'bg-purple-100 text-purple-700',
  super_admin: 'bg-orange-100 text-orange-700',
}

const ROLE_ICONS: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  user: Users,
  manager: Shield,
  admin: ShieldCheck,
  super_admin: Crown,
}

const PLAN_STYLES: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-[#1e3a5f] text-white',
  premium: 'bg-orange-500 text-white',
}

const ALL_ROLES: UserRole[] = ['user', 'manager', 'admin', 'super_admin']
const ALL_PLANS: PlanId[] = ['free', 'basic', 'pro', 'premium']

interface Props {
  callerRole: UserRole
}

export function AdminUsersClient({ callerRole }: Props) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [changingRole, setChangingRole] = useState<string | null>(null)

  const isSuperAdmin = callerRole === 'super_admin'

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (planFilter) params.set('plan', planFilter)
    if (roleFilter) params.set('role', roleFilter)
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    setUsers(data.users ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [planFilter, roleFilter]) // eslint-disable-line react-hooks/exhaustive-deps

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
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u))
    } finally {
      setChangingRole(null)
    }
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
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, plan_type: planId } : u))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <Users className="h-5 w-5" /> 회원 관리
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">전체 회원 목록 및 권한/플랜 관리</p>
        </div>
        <Badge className="bg-purple-100 text-purple-700 text-xs">
          {ROLE_LABELS[callerRole]}
        </Badge>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="이메일, 이름, 회사 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            className="pl-9"
          />
        </div>
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
        >
          <option value="">전체 플랜</option>
          {ALL_PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
        </select>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
        >
          <option value="">전체 역할</option>
          {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <Button variant="outline" onClick={load} className="shrink-0">검색</Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">회원 목록 ({users.length}명)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">검색 결과가 없습니다</div>
          ) : (
            <div className="divide-y">
              {users.map(u => {
                const RoleIcon = ROLE_ICONS[u.role]
                return (
                  <div key={u.user_id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                    <div className="w-9 h-9 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {(u.name ?? u.email)[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-800">{u.name ?? '(이름 없음)'}</span>
                        <span className="text-xs text-gray-500">{u.email}</span>
                        {u.company_name && <span className="text-xs text-gray-400">{u.company_name}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        가입: {new Date(u.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>

                    {/* 플랜 변경 */}
                    <select
                      value={u.plan_type}
                      onChange={e => handlePlanChange(u.user_id, e.target.value as PlanId)}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${PLAN_STYLES[u.plan_type]}`}
                    >
                      {ALL_PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                    </select>

                    {/* 역할 뱃지 / 변경 */}
                    {isSuperAdmin ? (
                      changingRole === u.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : (
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.user_id, e.target.value as UserRole)}
                          className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${ROLE_STYLES[u.role]}`}
                        >
                          {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      )
                    ) : (
                      <Badge className={`text-xs flex items-center gap-1 ${ROLE_STYLES[u.role]}`}>
                        <RoleIcon className="h-3 w-3" />
                        {ROLE_LABELS[u.role]}
                      </Badge>
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
