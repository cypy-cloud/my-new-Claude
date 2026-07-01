"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Settings, Lock } from "lucide-react"
import { toast } from "sonner"
import type { UserRole } from "@/lib/auth/permissions"

interface Setting {
  setting_key: string
  setting_value: string
  description: string | null
  updated_at: string
}

interface Props { callerRole: UserRole }

export function AdminSystemSettings({ callerRole }: Props) {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const isSuperAdmin = callerRole === 'super_admin'

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/system-settings')
    if (res.ok) {
      const data = await res.json()
      setSettings(data.settings ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(key: string) {
    const value = editing[key]
    if (value === undefined) return
    setSaving(key)
    const res = await fetch('/api/admin/system-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? '저장 실패') }
    else {
      toast.success(`'${key}' 설정이 저장되었습니다`)
      setSettings(prev => prev.map(s => s.setting_key === key ? { ...s, setting_value: value } : s))
      setEditing(prev => { const n = { ...prev }; delete n[key]; return n })
    }
    setSaving(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <Settings className="h-5 w-5" /> 시스템 설정
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {isSuperAdmin ? '슈퍼관리자 전용 · 변경 즉시 적용' : '슈퍼관리자만 변경 가능 (읽기 전용)'}
          </p>
        </div>
        {!isSuperAdmin && (
          <div className="flex items-center gap-1.5 text-orange-500 text-sm">
            <Lock className="h-4 w-4" /> 읽기 전용
          </div>
        )}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">설정 항목</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="space-y-4">
              {settings.map(s => {
                const isEditing = editing[s.setting_key] !== undefined
                const currentVal = editing[s.setting_key] ?? s.setting_value
                const isBool = s.setting_value === 'true' || s.setting_value === 'false'

                return (
                  <div key={s.setting_key} className="flex items-start gap-4 py-3 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-semibold text-[#1e3a5f]">{s.setting_key}</div>
                      {s.description && <div className="text-xs text-gray-500 mt-0.5">{s.description}</div>}
                      <div className="text-xs text-gray-400 mt-1">
                        마지막 수정: {new Date(s.updated_at).toLocaleString('ko-KR')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSuperAdmin ? (
                        isBool ? (
                          <select
                            value={currentVal}
                            onChange={e => setEditing(prev => ({ ...prev, [s.setting_key]: e.target.value }))}
                            className="border border-gray-200 rounded px-2 py-1 text-sm bg-white"
                          >
                            <option value="true">true (활성)</option>
                            <option value="false">false (비활성)</option>
                          </select>
                        ) : (
                          <Input
                            value={currentVal}
                            onChange={e => setEditing(prev => ({ ...prev, [s.setting_key]: e.target.value }))}
                            className="w-48 h-8 text-sm"
                          />
                        )
                      ) : (
                        <span className={`font-mono text-sm px-3 py-1 rounded-full ${
                          s.setting_value === 'true' ? 'bg-green-100 text-green-700' :
                          s.setting_value === 'false' ? 'bg-gray-100 text-gray-500' :
                          'bg-blue-50 text-blue-700'
                        }`}>
                          {s.setting_value || '(비어있음)'}
                        </span>
                      )}

                      {isSuperAdmin && isEditing && (
                        <>
                          <Button size="sm" className="h-8 text-xs" disabled={saving === s.setting_key}
                            onClick={() => handleSave(s.setting_key)}>
                            {saving === s.setting_key ? <Loader2 className="h-3 w-3 animate-spin" /> : '저장'}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs"
                            onClick={() => setEditing(prev => { const n = { ...prev }; delete n[s.setting_key]; return n })}>
                            취소
                          </Button>
                        </>
                      )}
                    </div>
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
