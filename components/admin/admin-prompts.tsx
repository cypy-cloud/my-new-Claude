"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, Plus, CheckCircle2, Lock, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { PROMPT_FEATURE_LABELS, type PromptFeatureType } from "@/types"

interface PromptVersionRow {
  id: string
  feature_type: PromptFeatureType
  version: string
  title: string | null
  system_prompt: string | null
  user_prompt_template: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const FEATURE_TYPES: PromptFeatureType[] = ['sms', 'script', 'pdf_explanation']

const emptyForm = { version: "", title: "", systemPrompt: "", userPromptTemplate: "", activate: false }

export function AdminPrompts({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [prompts, setPrompts] = useState<PromptVersionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [featureFilter, setFeatureFilter] = useState<PromptFeatureType>("sms")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/prompts?featureType=${featureFilter}`)
    const data = await res.json()
    setPrompts(data.prompts ?? [])
    setLoading(false)
  }, [featureFilter])

  useEffect(() => { load() }, [load])

  async function createVersion() {
    if (!form.version.trim() || !form.userPromptTemplate.trim()) {
      toast.error("버전과 프롬프트 본문은 필수입니다")
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featureType: featureFilter,
        version: form.version.trim(),
        title: form.title,
        systemPrompt: form.systemPrompt,
        userPromptTemplate: form.userPromptTemplate,
        activate: form.activate,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? '생성 실패')
      setSaving(false)
      return
    }
    toast.success('새 버전이 생성되었습니다')
    setForm(emptyForm)
    setCreating(false)
    setSaving(false)
    load()
  }

  async function activate(id: string) {
    setActivatingId(id)
    const res = await fetch('/api/admin/prompts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? '활성화 실패')
      setActivatingId(null)
      return
    }
    toast.success('활성 버전이 변경되었습니다')
    setActivatingId(null)
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
          <Sparkles className="h-5 w-5" /> AI 프롬프트 버전 관리
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          기능별 AI 프롬프트 버전을 관리합니다. {!isSuperAdmin && "프롬프트 수정/생성은 슈퍼관리자만 가능합니다."}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {FEATURE_TYPES.map((ft) => (
          <button
            key={ft}
            onClick={() => { setFeatureFilter(ft); setCreating(false) }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              featureFilter === ft ? "bg-[#1e3a5f] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {PROMPT_FEATURE_LABELS[ft]}
          </button>
        ))}
      </div>

      {featureFilter === 'script' && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            AI 상담 스크립트 생성은 품질 보호를 위해 프롬프트가 <code className="bg-amber-100 px-1 rounded">app/api/ai/script/route.ts</code>
            코드에 직접 고정되어 있습니다. 아래에서 새 버전을 만들거나 "활성화"해도 실제 생성 결과에는 반영되지 않습니다 —
            버전 기록·비교용으로만 사용해주세요. 실제로 반영하려면 개발자에게 코드 수정을 요청해야 합니다.
          </span>
        </div>
      )}

      {isSuperAdmin && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            {!creating ? (
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setCreating(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> 새 버전 만들기
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#1e3a5f]">{PROMPT_FEATURE_LABELS[featureFilter]} 새 버전</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">버전 (예: v2.1.0)</label>
                    <input
                      value={form.version}
                      onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">제목 (선택)</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">시스템 프롬프트 (선택)</label>
                  <textarea
                    value={form.systemPrompt}
                    onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">사용자 프롬프트 템플릿 (필수, {`{{변수명}}`} 형태로 변수 사용)</label>
                  <textarea
                    value={form.userPromptTemplate}
                    onChange={(e) => setForm((f) => ({ ...f, userPromptTemplate: e.target.value }))}
                    rows={8}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.activate}
                    onChange={(e) => setForm((f) => ({ ...f, activate: e.target.checked }))}
                  />
                  생성 즉시 활성화
                </label>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setCreating(false); setForm(emptyForm) }}>취소</Button>
                  <Button size="sm" className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]" disabled={saving} onClick={createVersion}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null} 생성
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">{PROMPT_FEATURE_LABELS[featureFilter]} 버전 목록 ({prompts.length}건)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : prompts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">버전이 없습니다</div>
          ) : (
            <div className="divide-y">
              {prompts.map((p) => {
                const isOpen = expandedId === p.id
                return (
                  <div key={p.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isOpen ? null : p.id)}>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-[#1e3a5f]">{p.version}</span>
                          {p.is_active && (
                            <Badge className="text-xs bg-green-100 text-green-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> 활성
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{p.title || '(제목 없음)'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          생성: {new Date(p.created_at).toLocaleString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!p.is_active && isSuperAdmin && (
                          <Button size="sm" variant="outline" disabled={activatingId === p.id} onClick={() => activate(p.id)}>
                            {activatingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '이 버전 활성화'}
                          </Button>
                        )}
                        {!p.is_active && !isSuperAdmin && (
                          <span className="text-xs text-gray-400 flex items-center gap-1"><Lock className="h-3 w-3" /> 슈퍼관리자 전용</span>
                        )}
                        <button onClick={() => setExpandedId(isOpen ? null : p.id)} className="p-1.5 text-gray-400 hover:text-gray-600">
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-4 pl-1 space-y-3">
                        {p.system_prompt && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">시스템 프롬프트</p>
                            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{p.system_prompt}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">사용자 프롬프트 템플릿</p>
                          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap font-mono">{p.user_prompt_template}</p>
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
