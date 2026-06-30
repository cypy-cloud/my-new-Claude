"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Rocket, Plus, Pencil, Trash2, Star, StarOff,
  Loader2, X, Save, ListPlus,
} from "lucide-react"
import { toast } from "sonner"

interface AppVersion {
  id: string
  version: string
  title: string
  description: string | null
  changes: string[]
  release_date: string
  is_current: boolean
  created_at: string
  updated_at: string
}

const DEFAULT_FORM = {
  version: '', title: '', description: '',
  changes: [''] as string[],
  releaseDate: new Date().toISOString().slice(0, 10),
  isCurrent: false,
}

export function AdminAppVersions() {
  const [list, setList] = useState<AppVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/app-versions')
    const data = await res.json()
    setList(data.versions ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm(DEFAULT_FORM)
    setEditId(null)
    setShowForm(true)
  }

  function openEdit(v: AppVersion) {
    setForm({
      version: v.version, title: v.title, description: v.description ?? '',
      changes: v.changes.length > 0 ? v.changes : [''],
      releaseDate: v.release_date,
      isCurrent: v.is_current,
    })
    setEditId(v.id)
    setShowForm(true)
  }

  function updateChange(idx: number, value: string) {
    setForm(f => ({ ...f, changes: f.changes.map((c, i) => i === idx ? value : c) }))
  }

  function addChangeRow() {
    setForm(f => ({ ...f, changes: [...f.changes, ''] }))
  }

  function removeChangeRow(idx: number) {
    setForm(f => ({ ...f, changes: f.changes.filter((_, i) => i !== idx) }))
  }

  async function save() {
    if (!form.version.trim() || !form.title.trim()) {
      toast.error('버전과 제목을 입력해주세요')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      changes: form.changes.map(c => c.trim()).filter(Boolean),
    }
    const res = await fetch('/api/admin/app-versions', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? '저장 실패'); setSaving(false); return }

    toast.success(editId ? '버전이 수정되었습니다' : '버전이 등록되었습니다')
    setShowForm(false)
    setEditId(null)
    await load()
    setSaving(false)
  }

  async function setCurrent(v: AppVersion) {
    await fetch('/api/admin/app-versions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: v.id, isCurrent: !v.is_current }),
    })
    toast.success(v.is_current ? '현재 버전 해제' : '현재 버전으로 설정')
    await load()
  }

  async function deleteVersion(id: string) {
    if (!confirm('이 버전을 삭제하시겠습니까?')) return
    setDeletingId(id)
    const res = await fetch(`/api/admin/app-versions?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('삭제되었습니다')
      setList(prev => prev.filter(x => x.id !== id))
    } else {
      toast.error('삭제 실패')
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <Rocket className="h-5 w-5" /> 버전 관리
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">서비스 버전 등록·수정·삭제, 현재 버전 설정</p>
        </div>
        <Button className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> 버전 등록
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-[#1e3a5f]/20 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-[#1e3a5f]">
                {editId ? '버전 수정' : '새 버전 등록'}
              </CardTitle>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">버전 (예: v0.2.0)</label>
                <Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                  placeholder="v0.2.0" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">출시일</label>
                <Input type="date" value={form.releaseDate}
                  onChange={e => setForm(f => ({ ...f, releaseDate: e.target.value }))} className="text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">옵션</label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer mt-1">
                  <input type="checkbox" checked={form.isCurrent}
                    onChange={e => setForm(f => ({ ...f, isCurrent: e.target.checked }))} />
                  현재 버전으로 설정
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">제목</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="버전 제목을 입력하세요" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">설명 (선택)</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="버전에 대한 간단한 설명"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">변경사항</label>
              <div className="space-y-2">
                {form.changes.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={c} onChange={e => updateChange(idx, e.target.value)}
                      placeholder="변경사항을 입력하세요" className="text-sm" />
                    <button onClick={() => removeChangeRow(idx)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addChangeRow} className="mt-2">
                <ListPlus className="h-3.5 w-3.5 mr-1.5" /> 항목 추가
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>취소</Button>
              <Button className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                {editId ? '수정 저장' : '버전 등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">버전 목록 ({list.length}건)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">등록된 버전이 없습니다</div>
          ) : (
            <div className="divide-y">
              {list.map(v => (
                <div key={v.id} className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {v.is_current && <Badge className="text-xs bg-orange-100 text-orange-600">⭐ 현재 버전</Badge>}
                      <Badge className="text-xs bg-gray-100 text-gray-600">{v.version}</Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{v.title}</p>
                    {v.changes.length > 0 && (
                      <ul className="text-xs text-gray-500 mt-1 list-disc list-inside space-y-0.5">
                        {v.changes.slice(0, 3).map((c, i) => <li key={i} className="truncate">{c}</li>)}
                      </ul>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(v.release_date).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button title={v.is_current ? '현재 버전 해제' : '현재 버전으로 설정'} onClick={() => setCurrent(v)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-orange-500">
                      {v.is_current ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                    </button>
                    <button title="수정" onClick={() => openEdit(v)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#1e3a5f]">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button title="삭제" onClick={() => deleteVersion(v.id)} disabled={deletingId === v.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      {deletingId === v.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
