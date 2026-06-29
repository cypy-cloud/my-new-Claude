"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import type { UserRole, PermissionKey } from "@/lib/auth/permissions"

interface PermRow {
  id: string
  role: UserRole
  permission_key: PermissionKey
  enabled: boolean
}

const ROLE_LABELS: Record<UserRole, string> = {
  user: '일반 (user)',
  manager: '매니저 (manager)',
  admin: '관리자 (admin)',
  super_admin: '슈퍼관리자 (super_admin)',
}

const PERM_LABELS: Record<string, string> = {
  'team.view_members': '팀원 목록 조회',
  'team.view_usage': '팀원 사용량 조회',
  'users.list': '회원 목록 조회',
  'users.view': '회원 상세 조회',
  'users.change_plan': '회원 플랜 변경',
  'users.change_role': '회원 역할 변경',
  'usage.view_stats': '사용량 통계 조회',
  'notice.write': '공지사항 작성',
  'feedback.view': '피드백 확인',
  'logs.view_errors': '에러 로그 확인',
  'logs.view_all': '전체 로그 확인',
  'system.settings': '시스템 설정',
  'ai.prompt_manage': 'AI 프롬프트 관리',
}

const ROLES: UserRole[] = ['user', 'manager', 'admin', 'super_admin']

export function AdminPermissionsClient() {
  const [perms, setPerms] = useState<PermRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/permissions')
      .then(r => r.json())
      .then(d => setPerms(d.permissions ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function toggle(row: PermRow) {
    const key = `${row.role}:${row.permission_key}`
    setToggling(key)
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: row.role, permissionKey: row.permission_key, enabled: !row.enabled }),
      })
      if (!res.ok) { toast.error('변경 실패'); return }
      setPerms(prev => prev.map(p =>
        p.role === row.role && p.permission_key === row.permission_key
          ? { ...p, enabled: !p.enabled }
          : p
      ))
      toast.success(`${PERM_LABELS[row.permission_key] ?? row.permission_key} 권한 ${!row.enabled ? '활성화' : '비활성화'}`)
    } finally {
      setToggling(null)
    }
  }

  const groupedByRole = ROLES.reduce<Record<UserRole, PermRow[]>>((acc, role) => {
    acc[role] = perms.filter(p => p.role === role)
    return acc
  }, {} as Record<UserRole, PermRow[]>)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> 권한 관리
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">역할별 세부 권한을 활성화/비활성화합니다 (super_admin 전용)</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid gap-4">
          {ROLES.filter(r => r !== 'user').map(role => (
            <Card key={role} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1e3a5f]">
                  {ROLE_LABELS[role]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {groupedByRole[role].length === 0 ? (
                  <p className="text-xs text-gray-400">설정된 권한 없음</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {groupedByRole[role].map(row => {
                      const key = `${row.role}:${row.permission_key}`
                      const isToggling = toggling === key
                      return (
                        <button
                          key={row.permission_key}
                          disabled={isToggling}
                          onClick={() => toggle(row)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            row.enabled
                              ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {isToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                            <span>{row.enabled ? '✓' : '✗'}</span>
                          )}
                          {PERM_LABELS[row.permission_key] ?? row.permission_key}
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-sm text-amber-700 font-medium">⚠️ 참고</p>
        <p className="text-xs text-amber-600 mt-1">
          서버 측 권한 검사는 <code>lib/auth/permissions.ts</code>의 정적 맵과 이 테이블을 함께 사용합니다.
          DB 변경은 즉시 반영되지만, 코드 재배포 없이는 정적 fallback 권한에 영향을 주지 않습니다.
        </p>
      </div>
    </div>
  )
}
