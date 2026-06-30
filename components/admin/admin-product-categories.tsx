"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tag, Loader2, Plus, ChevronDown, ChevronUp, Pencil, EyeOff, Eye } from "lucide-react"
import { toast } from "sonner"

interface CategoryRow {
  id: string
  name: string
  parent_id: string | null
  description: string | null
  risk_notice: string | null
  is_active: boolean
  created_at: string
}

const emptyForm = { name: "", parentId: "", description: "", riskNotice: "" }

export function AdminProductCategories({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/product-categories')
    const data = await res.json()
    setCategories(data.categories ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  async function createCategory() {
    if (!form.name.trim()) {
      toast.error("카테고리명을 입력해주세요")
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/product-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        parentId: form.parentId || null,
        description: form.description,
        riskNotice: form.riskNotice,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? '등록 실패')
      setSaving(false)
      return
    }
    toast.success('카테고리가 등록되었습니다')
    setForm(emptyForm)
    setCreating(false)
    setSaving(false)
    loadCategories()
  }

  function startEdit(c: CategoryRow) {
    setEditingId(c.id)
    setEditForm({ name: c.name, parentId: c.parent_id ?? "", description: c.description ?? "", riskNotice: c.risk_notice ?? "" })
  }

  async function saveEdit(id: string) {
    setUpdatingId(id)
    const res = await fetch('/api/admin/product-categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        name: editForm.name,
        parentId: editForm.parentId || null,
        description: editForm.description,
        riskNotice: editForm.riskNotice,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? '수정 실패')
      setUpdatingId(null)
      return
    }
    toast.success('카테고리가 수정되었습니다')
    setEditingId(null)
    setUpdatingId(null)
    loadCategories()
  }

  async function toggleActive(c: CategoryRow) {
    setUpdatingId(c.id)
    const res = await fetch('/api/admin/product-categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, isActive: !c.is_active }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? '변경 실패')
      setUpdatingId(null)
      return
    }
    toast.success(c.is_active ? '비활성화되었습니다' : '활성화되었습니다')
    setUpdatingId(null)
    loadCategories()
  }

  function categoryName(id: string | null) {
    if (!id) return null
    return categories.find((c) => c.id === id)?.name ?? null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
          <Tag className="h-5 w-5" /> 보험상품 카테고리 관리
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          AI 생성 시 선택 가능한 상품 카테고리와 카테고리별 주의문구를 관리합니다. {!isSuperAdmin && "등록/수정은 슈퍼관리자만 가능합니다."}
        </p>
      </div>

      {isSuperAdmin && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            {!creating ? (
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setCreating(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> 새 카테고리 추가
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#1e3a5f]">새 카테고리</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">카테고리명</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="예: 펫보험"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">상위 카테고리 (선택)</label>
                    <select
                      value={form.parentId}
                      onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">없음</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">설명</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">주의문구 (AI 결과에 자동 첨부)</label>
                  <textarea
                    value={form.riskNotice}
                    onChange={(e) => setForm((f) => ({ ...f, riskNotice: e.target.value }))}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setCreating(false); setForm(emptyForm) }}>취소</Button>
                  <Button size="sm" className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]" disabled={saving} onClick={createCategory}>
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
          <CardTitle className="text-base text-[#1e3a5f]">카테고리 목록 ({categories.length}건)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">등록된 카테고리가 없습니다</div>
          ) : (
            <div className="divide-y">
              {categories.map((c) => {
                const isOpen = expandedId === c.id
                const isEditing = editingId === c.id
                return (
                  <div key={c.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isOpen ? null : c.id)}>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-[#1e3a5f]">{c.name}</span>
                          {c.parent_id && (
                            <span className="text-xs text-gray-400">↳ {categoryName(c.parent_id) ?? '상위 카테고리'}</span>
                          )}
                          {!c.is_active && <Badge className="text-xs bg-gray-100 text-gray-500">비활성</Badge>}
                        </div>
                        {c.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{c.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isSuperAdmin && (
                          <>
                            <Button size="sm" variant="outline" disabled={updatingId === c.id} onClick={() => startEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" disabled={updatingId === c.id} onClick={() => toggleActive(c)}>
                              {updatingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : c.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </Button>
                          </>
                        )}
                        <button onClick={() => setExpandedId(isOpen ? null : c.id)} className="p-1.5 text-gray-400 hover:text-gray-600">
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {isOpen && !isEditing && (
                      <div className="mt-4 pl-1 space-y-3">
                        {c.description && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">설명</p>
                            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{c.description}</p>
                          </div>
                        )}
                        {c.risk_notice && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">주의문구</p>
                            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{c.risk_notice}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {isEditing && (
                      <div className="mt-4 pl-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">카테고리명</label>
                            <input
                              value={editForm.name}
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">상위 카테고리</label>
                            <select
                              value={editForm.parentId}
                              onChange={(e) => setEditForm((f) => ({ ...f, parentId: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            >
                              <option value="">없음</option>
                              {categories.filter((cat) => cat.id !== c.id).map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">설명</label>
                          <textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                            rows={2}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">주의문구</label>
                          <textarea
                            value={editForm.riskNotice}
                            onChange={(e) => setEditForm((f) => ({ ...f, riskNotice: e.target.value }))}
                            rows={2}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>취소</Button>
                          <Button size="sm" className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]" disabled={updatingId === c.id} onClick={() => saveEdit(c.id)}>
                            {updatingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null} 저장
                          </Button>
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
