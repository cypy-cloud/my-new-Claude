"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  BookOpen, Plus, Search, Pencil, Trash2, Crown,
  Eye, EyeOff, X, Save, ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Template {
  id: string
  title: string
  description: string | null
  category: string
  feature_type: string
  insurance_company_id: string | null
  template_content: string
  variables: { key: string; label: string; required: boolean }[]
  tags: string[]
  is_public: boolean
  is_premium: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  insurance_companies: { name: string } | null
  profiles: { name: string; email: string } | null
}

const FEATURE_OPTIONS = [
  { value: 'ai_message', label: 'AI 문자/카톡' },
  { value: 'ai_script', label: 'AI 스크립트' },
  { value: 'ai_document', label: 'AI PDF 분석' },
]

const CATEGORY_OPTIONS = [
  { value: 'new_contract', label: '신규계약' },
  { value: 'renewal', label: '갱신' },
  { value: 'claim', label: '보험금 청구' },
  { value: 'follow_up', label: '팔로업' },
  { value: 'general', label: '일반' },
  { value: 'greeting', label: '인사' },
]

const FEATURE_COLORS: Record<string, string> = {
  ai_message: 'bg-blue-100 text-blue-700',
  ai_script: 'bg-purple-100 text-purple-700',
  ai_document: 'bg-green-100 text-green-700',
}

type FormData = {
  title: string
  description: string
  category: string
  feature_type: string
  insurance_company_id: string
  template_content: string
  variables_raw: string
  tags_raw: string
  is_public: boolean
  is_premium: boolean
  is_active: boolean
  sort_order: number
}

const EMPTY_FORM: FormData = {
  title: '', description: '', category: 'general', feature_type: 'ai_message',
  insurance_company_id: '', template_content: '', variables_raw: '[]', tags_raw: '',
  is_public: true, is_premium: false, is_active: true, sort_order: 0,
}

function TemplateFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Template | null
  onSave: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState<FormData>(
    initial ? {
      title: initial.title,
      description: initial.description ?? '',
      category: initial.category,
      feature_type: initial.feature_type,
      insurance_company_id: initial.insurance_company_id ?? '',
      template_content: initial.template_content,
      variables_raw: JSON.stringify(initial.variables ?? [], null, 2),
      tags_raw: (initial.tags ?? []).join(', '),
      is_public: initial.is_public,
      is_premium: initial.is_premium,
      is_active: initial.is_active,
      sort_order: initial.sort_order,
    } : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)

  function set(k: keyof FormData, v: FormData[keyof FormData]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    if (!form.title || !form.template_content) {
      toast.error('제목과 템플릿 내용은 필수입니다')
      return
    }
    let variables = []
    try { variables = JSON.parse(form.variables_raw) } catch { toast.error('변수 JSON 형식 오류'); return }
    const tags = form.tags_raw.split(',').map(t => t.trim()).filter(Boolean)

    setSaving(true)
    const url = initial ? `/api/admin/templates/${initial.id}` : '/api/admin/templates'
    const method = initial ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, variables, tags, insurance_company_id: form.insurance_company_id || null }),
    })
    setSaving(false)

    if (!res.ok) { toast.error('저장 실패'); return }
    toast.success(initial ? '템플릿이 수정되었습니다' : '템플릿이 등록되었습니다')
    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-900">{initial ? '템플릿 수정' : '새 템플릿 등록'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">제목 *</label>
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="템플릿 제목" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">기능 구분 *</label>
              <select
                className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm"
                value={form.feature_type}
                onChange={e => set('feature_type', e.target.value)}
              >
                {FEATURE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">카테고리 *</label>
              <select
                className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm"
                value={form.category}
                onChange={e => set('category', e.target.value)}
              >
                {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">설명</label>
              <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="템플릿 설명 (선택)" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">정렬 순서</label>
              <Input type="number" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">태그 (쉼표 구분)</label>
              <Input value={form.tags_raw} onChange={e => set('tags_raw', e.target.value)} placeholder="신규계약, 감사인사" />
            </div>
          </div>

          {/* 옵션 */}
          <div className="flex gap-4 flex-wrap">
            {([
              ['is_public', '공개 템플릿'],
              ['is_premium', '프리미엄 전용'],
              ['is_active', '활성화'],
            ] as [keyof FormData, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key] as boolean}
                  onChange={e => set(key, e.target.checked)}
                  className="w-4 h-4 accent-[#1e3a5f]"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>

          {/* 템플릿 내용 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              템플릿 내용 * <span className="text-gray-400 font-normal">(변수는 {'{{변수명}}'} 형식 사용)</span>
            </label>
            <textarea
              className="w-full h-48 border border-gray-200 rounded-xl p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
              value={form.template_content}
              onChange={e => set('template_content', e.target.value)}
              placeholder="안녕하세요 {{name}}님..."
            />
          </div>

          {/* 변수 정의 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              변수 정의 (JSON)
              <span className="text-gray-400 font-normal ml-1">예: [{'"key"'}:"name",{'"label"'}:"고객명",{'"required"'}:true]</span>
            </label>
            <textarea
              className="w-full h-28 border border-gray-200 rounded-xl p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
              value={form.variables_raw}
              onChange={e => set('variables_raw', e.target.value)}
            />
          </div>
        </div>

        <div className="p-5 border-t flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
          <Button
            className="flex-1 bg-[#1e3a5f] hover:bg-[#162d4a] text-white"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [featureFilter, setFeatureFilter] = useState('')
  const [editTarget, setEditTarget] = useState<Template | null | undefined>(undefined)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (featureFilter) params.set('feature_type', featureFilter)
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/templates?${params}`)
    const data = await res.json()
    setTemplates(data.templates ?? [])
    setLoading(false)
  }, [featureFilter, search])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('삭제 실패'); return }
    toast.success('템플릿이 삭제되었습니다')
    setDeleteId(null)
    fetchTemplates()
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#1e3a5f]" />
            템플릿 관리
          </h1>
          <p className="text-sm text-gray-500 mt-1">사용자에게 제공할 템플릿을 등록하고 관리합니다</p>
        </div>
        <Button
          className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white"
          onClick={() => setEditTarget(null)}
        >
          <Plus className="h-4 w-4 mr-2" /> 새 템플릿 등록
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="템플릿 검색..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchTemplates()}
          />
        </div>
        <select
          className="h-9 border border-gray-200 rounded-lg px-3 text-sm"
          value={featureFilter}
          onChange={e => setFeatureFilter(e.target.value)}
        >
          <option value="">전체 기능</option>
          {FEATURE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Button variant="outline" onClick={fetchTemplates}>검색</Button>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">불러오는 중...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-200" />
          <p>등록된 템플릿이 없습니다</p>
          <Button className="mt-4 bg-[#1e3a5f] text-white" onClick={() => setEditTarget(null)}>
            첫 템플릿 등록하기
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">제목</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">기능</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">카테고리</th>
                <th className="text-center py-3 px-4 text-gray-500 font-medium">공개</th>
                <th className="text-center py-3 px-4 text-gray-500 font-medium">프리미엄</th>
                <th className="text-center py-3 px-4 text-gray-500 font-medium">상태</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t, i) => (
                <tr key={t.id} className={cn("border-b border-gray-50 hover:bg-gray-50/50", i % 2 === 1 && "bg-gray-50/30")}>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-800">{t.title}</div>
                    {t.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.description}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn("text-xs px-2 py-1 rounded-full font-medium", FEATURE_COLORS[t.feature_type])}>
                      {FEATURE_OPTIONS.find(o => o.value === t.feature_type)?.label ?? t.feature_type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-gray-600">
                      {CATEGORY_OPTIONS.find(o => o.value === t.category)?.label ?? t.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {t.is_public
                      ? <Eye className="h-4 w-4 text-green-500 mx-auto" />
                      : <EyeOff className="h-4 w-4 text-gray-300 mx-auto" />}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {t.is_premium && <Crown className="h-4 w-4 text-orange-500 mx-auto" />}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge className={cn("text-xs border-0", t.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                      {t.is_active ? '활성' : '비활성'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setEditTarget(t)}
                        className="p-1.5 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded-lg"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(t.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 등록/수정 모달 */}
      {editTarget !== undefined && (
        <TemplateFormModal
          initial={editTarget}
          onSave={fetchTemplates}
          onClose={() => setEditTarget(undefined)}
        />
      )}

      {/* 삭제 확인 */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">템플릿 삭제</h3>
            <p className="text-sm text-gray-600 mb-5">이 템플릿을 삭제하면 복구할 수 없습니다. 계속하시겠습니까?</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>취소</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={() => handleDelete(deleteId)}>
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
