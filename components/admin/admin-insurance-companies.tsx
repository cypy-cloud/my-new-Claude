"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, Loader2, Plus, CheckCircle2, Lock, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import type { AiCoreFeature } from "@/lib/ai-core/types"

interface CompanyRow {
  id: string
  name: string
  company_type: 'life' | 'non_life' | 'ga' | 'other'
  is_active: boolean
  created_at: string
}

interface ProfileRow {
  id: string
  company_id: string
  feature_type: AiCoreFeature
  tone_guide: string | null
  compliance_guide: string | null
  forbidden_expressions: string[]
  preferred_expressions: string[]
  disclaimer_template: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

const FEATURE_TYPES: AiCoreFeature[] = [
  'sms_message', 'sales_script', 'pdf_explanation',
  'newsletter', 'blog_content', 'crm_followup', 'objection_handling', 'product_summary',
]

const FEATURE_LABELS: Record<AiCoreFeature, string> = {
  sms_message: '문자/카톡 메시지',
  sales_script: '상담 스크립트',
  pdf_explanation: 'PDF 약관 설명',
  newsletter: '뉴스레터',
  blog_content: '블로그 콘텐츠',
  crm_followup: 'CRM 후속 연락',
  objection_handling: '반론 처리',
  product_summary: '상품 요약',
}

const COMPANY_TYPE_LABELS: Record<CompanyRow['company_type'], string> = {
  life: '생명보험',
  non_life: '손해보험',
  ga: 'GA',
  other: '기타',
}

const emptyProfileForm = {
  toneGuide: "", complianceGuide: "", forbiddenExpressions: "", preferredExpressions: "",
  disclaimerTemplate: "", activate: false,
}

export function AdminInsuranceCompanies({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyType, setNewCompanyType] = useState<CompanyRow['company_type']>('other')
  const [savingCompany, setSavingCompany] = useState(false)

  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [featureFilter, setFeatureFilter] = useState<AiCoreFeature>('sms_message')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyProfileForm)
  const [saving, setSaving] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true)
    const res = await fetch('/api/admin/insurance-companies')
    const data = await res.json()
    const list: CompanyRow[] = data.companies ?? []
    setCompanies(list)
    setSelectedCompanyId((prev) => prev || list[0]?.id || "")
    setLoadingCompanies(false)
  }, [])

  useEffect(() => { loadCompanies() }, [loadCompanies])

  const loadProfiles = useCallback(async () => {
    if (!selectedCompanyId) { setProfiles([]); return }
    setLoadingProfiles(true)
    const res = await fetch(`/api/admin/company-prompts?companyId=${selectedCompanyId}`)
    const data = await res.json()
    setProfiles((data.profiles ?? []).filter((p: ProfileRow) => p.feature_type === featureFilter))
    setLoadingProfiles(false)
  }, [selectedCompanyId, featureFilter])

  useEffect(() => { loadProfiles() }, [loadProfiles])

  async function createCompany() {
    if (!newCompanyName.trim()) {
      toast.error("보험사명을 입력해주세요")
      return
    }
    setSavingCompany(true)
    const res = await fetch('/api/admin/insurance-companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCompanyName.trim(), companyType: newCompanyType }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? '등록 실패')
      setSavingCompany(false)
      return
    }
    toast.success('보험사가 등록되었습니다')
    setNewCompanyName("")
    setNewCompanyType('other')
    setSavingCompany(false)
    loadCompanies()
  }

  async function createProfile() {
    setSaving(true)
    const res = await fetch('/api/admin/company-prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: selectedCompanyId,
        featureType: featureFilter,
        toneGuide: form.toneGuide,
        complianceGuide: form.complianceGuide,
        forbiddenExpressions: form.forbiddenExpressions.split(',').map((s) => s.trim()).filter(Boolean),
        preferredExpressions: form.preferredExpressions.split(',').map((s) => s.trim()).filter(Boolean),
        disclaimerTemplate: form.disclaimerTemplate,
        activate: form.activate,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? '생성 실패')
      setSaving(false)
      return
    }
    toast.success('프롬프트 프로필이 생성되었습니다')
    setForm(emptyProfileForm)
    setCreating(false)
    setSaving(false)
    loadProfiles()
  }

  async function activate(id: string) {
    setActivatingId(id)
    const res = await fetch('/api/admin/company-prompts', {
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
    toast.success('활성 프로필이 변경되었습니다')
    setActivatingId(null)
    loadProfiles()
  }

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
          <Building2 className="h-5 w-5" /> 보험사별 AI 프롬프트 관리
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          보험사별로 말투, 금지 표현, 고지문을 다르게 설정합니다. {!isSuperAdmin && "등록/수정은 슈퍼관리자만 가능합니다."}
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">보험사 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingCompanies ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompanyId(c.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCompanyId === c.id ? "bg-[#1e3a5f] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {c.name}
                  {!c.is_active && <span className="ml-1 text-xs opacity-70">(비활성)</span>}
                </button>
              ))}
            </div>
          )}

          {isSuperAdmin && (
            <div className="flex items-end gap-2 pt-2 border-t">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">새 보험사명</label>
                <input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="예: 롯데손해보험"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">유형</label>
                <select
                  value={newCompanyType}
                  onChange={(e) => setNewCompanyType(e.target.value as CompanyRow['company_type'])}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {(Object.keys(COMPANY_TYPE_LABELS) as CompanyRow['company_type'][]).map((t) => (
                    <option key={t} value={t}>{COMPANY_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <Button size="sm" disabled={savingCompany} onClick={createCompany} className="bg-orange-500 hover:bg-orange-600 text-white">
                {savingCompany ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />} 등록
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCompany && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            {FEATURE_TYPES.map((ft) => (
              <button
                key={ft}
                onClick={() => { setFeatureFilter(ft); setCreating(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  featureFilter === ft ? "bg-[#1e3a5f] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {FEATURE_LABELS[ft]}
              </button>
            ))}
          </div>

          {isSuperAdmin && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                {!creating ? (
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setCreating(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> {selectedCompany.name} - {FEATURE_LABELS[featureFilter]} 새 프로필
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[#1e3a5f]">{selectedCompany.name} - {FEATURE_LABELS[featureFilter]} 새 프로필</p>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">말투 가이드</label>
                      <textarea
                        value={form.toneGuide}
                        onChange={(e) => setForm((f) => ({ ...f, toneGuide: e.target.value }))}
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">컴플라이언스 가이드</label>
                      <textarea
                        value={form.complianceGuide}
                        onChange={(e) => setForm((f) => ({ ...f, complianceGuide: e.target.value }))}
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">금지 표현 (쉼표로 구분)</label>
                        <input
                          value={form.forbiddenExpressions}
                          onChange={(e) => setForm((f) => ({ ...f, forbiddenExpressions: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="예: 100% 보장, 무조건 가입"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">권장 표현 (쉼표로 구분)</label>
                        <input
                          value={form.preferredExpressions}
                          onChange={(e) => setForm((f) => ({ ...f, preferredExpressions: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">고지문 템플릿</label>
                      <textarea
                        value={form.disclaimerTemplate}
                        onChange={(e) => setForm((f) => ({ ...f, disclaimerTemplate: e.target.value }))}
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
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
                      <Button size="sm" variant="outline" onClick={() => { setCreating(false); setForm(emptyProfileForm) }}>취소</Button>
                      <Button size="sm" className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]" disabled={saving} onClick={createProfile}>
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
              <CardTitle className="text-base text-[#1e3a5f]">
                {selectedCompany.name} - {FEATURE_LABELS[featureFilter]} 프로필 목록 ({profiles.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingProfiles ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
              ) : profiles.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">등록된 프로필이 없습니다 (기본 프롬프트가 사용됩니다)</div>
              ) : (
                <div className="divide-y">
                  {profiles.map((p) => {
                    const isOpen = expandedId === p.id
                    return (
                      <div key={p.id} className="px-6 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isOpen ? null : p.id)}>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-semibold text-[#1e3a5f]">{p.tone_guide?.slice(0, 30) || '(말투 미설정)'}</span>
                              {p.is_active && (
                                <Badge className="text-xs bg-green-100 text-green-700">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> 활성
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              생성: {new Date(p.created_at).toLocaleString('ko-KR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!p.is_active && isSuperAdmin && (
                              <Button size="sm" variant="outline" disabled={activatingId === p.id} onClick={() => activate(p.id)}>
                                {activatingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '이 프로필 활성화'}
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
                            {p.tone_guide && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">말투 가이드</p>
                                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{p.tone_guide}</p>
                              </div>
                            )}
                            {p.compliance_guide && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">컴플라이언스 가이드</p>
                                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{p.compliance_guide}</p>
                              </div>
                            )}
                            {p.forbidden_expressions.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">금지 표현</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {p.forbidden_expressions.map((e) => (
                                    <Badge key={e} className="text-xs bg-red-50 text-red-600">{e}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {p.preferred_expressions.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">권장 표현</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {p.preferred_expressions.map((e) => (
                                    <Badge key={e} className="text-xs bg-blue-50 text-blue-600">{e}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {p.disclaimer_template && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">고지문 템플릿</p>
                                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{p.disclaimer_template}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
