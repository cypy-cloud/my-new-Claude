"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import {
  MessageSquare, BookOpen, FileText, Copy, Download, Search, Archive,
  Star, StarOff, Trash2, Pencil, Check, X, ChevronDown, Eye,
  Loader2, RefreshCw, ShieldAlert, BookmarkCheck, Mail, PenSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { clientTrackDownload } from "@/lib/analytics/client-track"
import { NewsletterImagePanel } from "@/components/newsletter/newsletter-image-panel"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Output {
  id: string
  type: "sms" | "script" | "pdf_explanation" | "newsletter" | "content"
  title: string
  output_text: string
  ai_provider: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  sms:             { label: "AI 문자/카톡",  icon: MessageSquare, iconBg: "bg-blue-100 text-blue-600",    badge: "bg-blue-100 text-blue-700 border-blue-200"    },
  script:          { label: "AI 스크립트",   icon: BookOpen,      iconBg: "bg-purple-100 text-purple-600", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  pdf_explanation: { label: "AI 설명자료",   icon: FileText,      iconBg: "bg-orange-100 text-orange-500", badge: "bg-orange-100 text-orange-700 border-orange-200" },
  newsletter:      { label: "뉴스레터",      icon: Mail,          iconBg: "bg-green-100 text-green-600",   badge: "bg-green-100 text-green-700 border-green-200"   },
  content:         { label: "블로그·SNS",    icon: PenSquare,     iconBg: "bg-pink-100 text-pink-600",     badge: "bg-pink-100 text-pink-700 border-pink-200"      },
}

const SORT_OPTIONS = [
  { value: "newest", label: "최신순" },
  { value: "oldest", label: "오래된순" },
  { value: "favorite", label: "즐겨찾기 먼저" },
]

const FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "sms", label: "AI 문자/카톡" },
  { value: "script", label: "AI 스크립트" },
  { value: "pdf_explanation", label: "AI 설명자료" },
  { value: "newsletter", label: "뉴스레터" },
  { value: "content", label: "블로그·SNS" },
  { value: "favorite", label: "⭐ 즐겨찾기" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })
}

function getPreview(text: string, maxLen = 100) {
  const clean = text.replace(/\[.*?\]\n?/g, " ").replace(/\s+/g, " ").trim()
  return clean.length > maxLen ? clean.slice(0, maxLen) + "..." : clean
}

// app/(dashboard)/newsletter/page.tsx의 buildFullText()가 만든 "【라벨】\n내용" 형식의
// 저장 텍스트를, 뉴스레터 이미지 패널이 요구하는 sections 객체로 다시 되돌린다.
// 이렇게 하면 보관함에서도 사용량 차감(재생성) 없이 바로 이미지를 만들 수 있다.
const NEWSLETTER_LABEL_TO_KEY: Record<string, string> = {
  "뉴스레터 제목": "TITLE",
  "인사말": "GREETING",
  "핵심 이슈 1": "ISSUE_1",
  "핵심 이슈 2": "ISSUE_2",
  "핵심 이슈 3": "ISSUE_3",
  "보험 점검 포인트": "CHECK_POINTS",
  "고객 행동 유도 문구": "CTA",
  "카톡 발송용 요약": "KAKAO_SUMMARY",
}

function parseNewsletterSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const regex = /【([^】]+)】\n([\s\S]*?)(?=\n【|\n=+\n|$)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const key = NEWSLETTER_LABEL_TO_KEY[match[1].trim()]
    if (key) sections[key] = match[2].trim()
  }
  return sections
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResultsVault() {
  const [outputs, setOutputs] = useState<Output[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [sort, setSort] = useState("newest")
  const [detailId, setDetailId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [showBackupWarning, setShowBackupWarning] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)

  async function loadOutputs() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/outputs")
      const data = await res.json()
      if (res.ok) setOutputs(data.outputs ?? [])
    } catch {
      toast.error("결과물 목록을 불러오지 못했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadOutputs() }, [])

  // ── Filtering + Sorting ──────────────────────────────────────────────────

  const filtered = outputs
    .filter(o => {
      if (filter === "favorite") return o.is_favorite
      if (filter !== "all") return o.type === filter
      return true
    })
    .filter(o => {
      if (!search) return true
      const q = search.toLowerCase()
      return o.title.toLowerCase().includes(q) || o.output_text.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sort === "favorite") {
        if (a.is_favorite && !b.is_favorite) return -1
        if (!a.is_favorite && b.is_favorite) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const detailOutput = outputs.find(o => o.id === detailId)

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleFavorite(id: string, current: boolean) {
    const next = !current
    setOutputs(prev => prev.map(o => o.id === id ? { ...o, is_favorite: next } : o))
    try {
      await fetch("/api/outputs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isFavorite: next }),
      })
      toast.success(next ? "즐겨찾기에 추가되었습니다" : "즐겨찾기에서 제거되었습니다")
    } catch {
      setOutputs(prev => prev.map(o => o.id === id ? { ...o, is_favorite: current } : o))
      toast.error("업데이트에 실패했습니다")
    }
  }

  function startEdit(o: Output) {
    setEditingId(o.id)
    setEditTitle(o.title)
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  async function commitEdit(id: string) {
    const trimmed = editTitle.trim()
    if (!trimmed) { setEditingId(null); return }
    setOutputs(prev => prev.map(o => o.id === id ? { ...o, title: trimmed } : o))
    setEditingId(null)
    try {
      await fetch("/api/outputs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: trimmed }),
      })
    } catch {
      toast.error("제목 수정에 실패했습니다")
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}"을 삭제하시겠습니까?`)) return
    setOutputs(prev => prev.filter(o => o.id !== id))
    if (detailId === id) setDetailId(null)
    try {
      const res = await fetch(`/api/outputs?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("삭제되었습니다")
    } catch {
      toast.error("삭제에 실패했습니다")
      loadOutputs()
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    toast.success("클립보드에 복사되었습니다")
  }

  function handleTxtDownload(o: Output) {
    const filename = `${o.title.replace(/\s+/g, "_")}_${o.created_at.slice(0, 10)}.txt`
    downloadBlob(o.output_text, filename, "text/plain")
    clientTrackDownload("result", { outputId: o.id, type: o.type, format: "txt" })
    toast.success("TXT 파일이 다운로드됩니다")
  }

  function handleDocxDownload(o: Output) {
    // Simple DOCX-compatible HTML wrapped in XML — opens in Word
    const body = o.output_text
      .split("\n")
      .map(line => line.trim() ? `<w:p><w:r><w:t xml:space="preserve">${line.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</w:t></w:r></w:p>` : "<w:p/>")
      .join("\n")

    const docxml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>${o.title}</w:t></w:r></w:p>
<w:p><w:r><w:t>생성일: ${formatDate(o.created_at)}</w:t></w:r></w:p>
<w:p/>
${body}
</w:body>
</w:document>`
    const filename = `${o.title.replace(/\s+/g, "_")}_${o.created_at.slice(0, 10)}.xml`
    downloadBlob(docxml, filename, "application/xml")
    clientTrackDownload("result", { outputId: o.id, type: o.type, format: "docx" })
    toast.success("Word 호환 XML 파일이 다운로드됩니다")
  }

  const handleBackup = useCallback(async () => {
    setShowBackupWarning(false)
    setIsBackingUp(true)
    try {
      const res = await fetch("/api/outputs/backup")
      if (!res.ok) throw new Error("백업 생성 실패")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const date = new Date().toISOString().slice(0, 10)
      a.download = `FP_AI_백업_${date}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("전체 백업 ZIP 다운로드가 시작됩니다")
      clientTrackDownload("backup", { outputCount: outputs.length })
    } catch {
      toast.error("백업 생성에 실패했습니다")
    } finally {
      setIsBackingUp(false)
    }
  }, [outputs.length])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── 헤더 ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">내 결과물 보관함</h1>
          <p className="text-gray-500 mt-1 text-sm">AI가 생성한 모든 결과물을 확인하고 관리하세요</p>
        </div>
        <Button
          onClick={() => setShowBackupWarning(true)}
          disabled={isBackingUp}
          variant="outline"
          className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white self-start sm:self-auto"
        >
          {isBackingUp
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />ZIP 생성 중...</>
            : <><Download className="h-4 w-4 mr-2" />전체 백업 (ZIP)</>}
        </Button>
      </div>

      {/* ── 백업 경고 ─────────────────────────────────────── */}
      {showBackupWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">백업 전 확인해주세요</p>
              <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                다운로드한 자료는 사용자의 기기에 저장됩니다. 고객정보나 민감정보가 포함되어 있는지 반드시 확인하고 안전하게 보관해 주세요.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowBackupWarning(false)}>취소</Button>
            <Button size="sm" onClick={handleBackup} className="bg-amber-600 hover:bg-amber-700 text-white">
              확인 후 다운로드
            </Button>
          </div>
        </div>
      )}

      {/* ── 검색 + 필터 + 정렬 ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="제목 또는 내용 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="h-9 pl-3 pr-8 rounded-md border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="h-9 pl-3 pr-8 rounded-md border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>
          <Button variant="ghost" size="sm" onClick={loadOutputs} className="h-9 px-2 text-gray-500">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── 결과 카운트 ───────────────────────────────────── */}
      <p className="text-xs text-gray-400">
        {search || filter !== "all"
          ? `${filtered.length}개 결과 (전체 ${outputs.length}개)`
          : `전체 ${outputs.length}개의 결과물`}
      </p>

      {/* ── 목록 + 상세 ───────────────────────────────────── */}
      <div className={`grid gap-4 ${detailId ? "grid-cols-1 lg:grid-cols-[1fr_440px]" : "grid-cols-1"}`}>
        {/* List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /><span className="text-sm">불러오는 중...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3 border-2 border-dashed rounded-xl border-gray-100">
              <Archive className="h-12 w-12 text-gray-200" />
              <p className="font-medium text-sm">{search ? "검색 결과가 없습니다" : "결과물이 없습니다"}</p>
              <p className="text-xs">{search ? "다른 검색어를 시도해보세요" : "AI 기능을 사용하면 결과물이 여기에 저장됩니다"}</p>
            </div>
          ) : (
            filtered.map(out => {
              const cfg = TYPE_CONFIG[out.type]
              const Icon = cfg.icon
              const isActive = detailId === out.id
              const isEditing = editingId === out.id

              return (
                <Card
                  key={out.id}
                  className={`border transition-all hover:shadow-sm ${isActive ? "border-[#1e3a5f] shadow-sm" : "border-gray-100"}`}
                >
                  <CardContent className="p-3.5">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isEditing ? (
                            <div className="flex items-center gap-1 flex-1">
                              <Input
                                ref={editInputRef}
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") commitEdit(out.id)
                                  if (e.key === "Escape") setEditingId(null)
                                }}
                                className="h-7 text-xs px-2 flex-1"
                              />
                              <button onClick={() => commitEdit(out.id)} className="text-green-600 hover:text-green-700 p-1">
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-[#1e3a5f] truncate max-w-[240px]">{out.title}</span>
                          )}
                          <Badge className={`text-[10px] px-1.5 py-0 border ${cfg.badge}`}>{cfg.label}</Badge>
                          {out.is_favorite && <BookmarkCheck className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                        </div>
                        {!isEditing && (
                          <p className="text-xs text-gray-500 truncate">{getPreview(out.output_text)}</p>
                        )}
                        <p className="text-[10px] text-gray-400">{formatDate(out.created_at)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleFavorite(out.id, out.is_favorite)}
                          className={`p-1.5 rounded-lg transition-colors ${out.is_favorite ? "text-orange-500 hover:text-orange-600" : "text-gray-300 hover:text-orange-400"}`}
                          title={out.is_favorite ? "즐겨찾기 해제" : "즐겨찾기"}
                        >
                          {out.is_favorite ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => startEdit(out)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 transition-colors"
                          title="제목 수정"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDetailId(isActive ? null : out.id)}
                          className={`p-1.5 rounded-lg transition-colors ${isActive ? "text-[#1e3a5f]" : "text-gray-300 hover:text-gray-600"}`}
                          title="상세 보기"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleCopy(out.output_text)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 transition-colors"
                          title="복사"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleTxtDownload(out)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 transition-colors"
                          title="TXT 다운로드"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(out.id, out.title)}
                          className="p-1.5 rounded-lg text-gray-200 hover:text-red-500 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Detail panel */}
        {detailOutput && (
          <div className="lg:sticky lg:top-4 space-y-3">
            <Card className="border-[#1e3a5f]">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1e3a5f] break-words">{detailOutput.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(detailOutput.created_at)}</p>
                  </div>
                  <button onClick={() => setDetailId(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Download buttons */}
                <div className="flex gap-1.5 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => handleCopy(detailOutput.output_text)} className="h-7 text-xs px-2.5">
                    <Copy className="h-3 w-3 mr-1" />복사
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleTxtDownload(detailOutput)} className="h-7 text-xs px-2.5">
                    <Download className="h-3 w-3 mr-1" />TXT
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDocxDownload(detailOutput)} className="h-7 text-xs px-2.5">
                    <Download className="h-3 w-3 mr-1" />DOCX
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleFavorite(detailOutput.id, detailOutput.is_favorite)} className="h-7 text-xs px-2.5">
                    {detailOutput.is_favorite
                      ? <><StarOff className="h-3 w-3 mr-1" />즐겨찾기 해제</>
                      : <><Star className="h-3 w-3 mr-1" />즐겨찾기</>}
                  </Button>
                  {detailOutput.type === "newsletter" && (
                    <NewsletterImagePanel
                      sections={parseNewsletterSections(detailOutput.output_text)}
                      topic={detailOutput.title.replace(/^\[뉴스레터\]\s*/, "")}
                    />
                  )}
                </div>

                {/* Full content */}
                <div className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 bg-gray-50 rounded-lg p-3 max-h-[500px] overflow-y-auto border">
                  {detailOutput.output_text}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
