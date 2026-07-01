"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  FolderOpen, Upload, Trash2, Loader2, FileText, Lock, Users,
  Sparkles, X, ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react"
import type { TeamFile, TeamRole } from "@/lib/team/types"

// ──────────────────────────────────────────────
// 상태 배지
// ──────────────────────────────────────────────
function StatusBadge({ status }: { status: TeamFile["status"] }) {
  if (status === "completed" || status === "original_expired")
    return <Badge className="bg-green-100 text-green-700 text-xs">사용 가능</Badge>
  if (status === "processing")
    return <Badge className="bg-yellow-100 text-yellow-700 text-xs">처리 중</Badge>
  if (status === "failed")
    return <Badge className="bg-red-100 text-red-700 text-xs">추출 실패</Badge>
  return null
}

// ──────────────────────────────────────────────
// 공개 범위 배지
// ──────────────────────────────────────────────
function VisibilityBadge({ visibility }: { visibility: TeamFile["visibility"] }) {
  if (visibility === "managers_only")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
        <Lock className="h-3 w-3" /> 관리자 전용
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
      <Users className="h-3 w-3" /> 팀 전체
    </span>
  )
}

// ──────────────────────────────────────────────
// 모달 오버레이
// ──────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// 생성 결과 표시
// ──────────────────────────────────────────────
const SECTION_LABELS: Record<string, string> = {
  SUMMARY: "📋 요약",
  COVERAGE: "🛡️ 주요 보장",
  MISCONCEPTIONS: "❗ 흔한 오해",
  CHECKLIST: "✅ 체크리스트",
  EXCLUSIONS: "⛔ 면책 사항",
  QNA: "❓ Q&A",
  AGENT_SCRIPT: "💬 상담 스크립트",
  CAUTION: "⚠️ 주의사항",
}

function GenerateResult({ sections, fileName }: { sections: Record<string, string>; fileName: string }) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(["SUMMARY", "AGENT_SCRIPT"]))
  const [copied, setCopied] = useState(false)

  const toggle = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const copyAll = () => {
    const text = Object.entries(sections)
      .map(([k, v]) => `${SECTION_LABELS[k] ?? k}\n${v}`)
      .join("\n\n")
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 truncate">📄 {fileName}</p>
        <Button size="sm" variant="outline" onClick={copyAll} className="shrink-0">
          {copied
            ? <><Check className="h-3.5 w-3.5 mr-1" />복사됨</>
            : <><Copy className="h-3.5 w-3.5 mr-1" />전체 복사</>}
        </Button>
      </div>
      <div className="space-y-2">
        {Object.entries(sections).map(([key, content]) => (
          <div key={key} className="border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-left"
              onClick={() => toggle(key)}
            >
              {SECTION_LABELS[key] ?? key}
              {openSections.has(key)
                ? <ChevronUp className="h-4 w-4 text-gray-400" />
                : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {openSections.has(key) && (
              <div className="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-white">
                {content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// AI 생성 모달
// ──────────────────────────────────────────────
function GenerateModal({ file, onClose }: { file: TeamFile; onClose: () => void }) {
  const [purpose, setPurpose] = useState("")
  const [ageGroup, setAgeGroup] = useState("")
  const [difficulty, setDifficulty] = useState("중간 (일반인)")
  const [generating, setGenerating] = useState(false)
  const [sections, setSections] = useState<Record<string, string> | null>(null)
  const [fileName, setFileName] = useState("")

  const generate = async () => {
    if (!purpose.trim()) { toast.error("설명 목적을 입력해주세요"); return }
    setGenerating(true)
    try {
      const res = await fetch(`/api/teams/files/${file.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          explanationPurpose: purpose.trim(),
          ageGroup: ageGroup || undefined,
          difficultyLevel: difficulty,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "생성 실패"); return }
      setSections(data.sections)
      setFileName(data.fileName ?? file.original_file_name)
      toast.success("AI 설명자료가 생성되었습니다")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modal title="✨ AI 설명자료 생성" onClose={onClose}>
      {sections ? (
        <GenerateResult sections={sections} fileName={fileName} />
      ) : (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
            <strong>{file.original_file_name}</strong> 자료를 바탕으로 AI가 설명자료를 생성합니다.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명 목적 <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="예: 40대 자영업자 고객에게 암보험 핵심 보장을 쉽게 설명하고 싶습니다"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">연령대 (선택)</label>
              <select
                value={ageGroup}
                onChange={e => setAgeGroup(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="">연령대 선택</option>
                <option value="20대">20대</option>
                <option value="30대">30대</option>
                <option value="40대">40대</option>
                <option value="50대">50대</option>
                <option value="60대 이상">60대 이상</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">설명 난이도</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="쉽게 (비전문가)">쉽게 (비전문가)</option>
                <option value="중간 (일반인)">중간 (일반인)</option>
                <option value="상세하게 (전문적)">상세하게 (전문적)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">취소</Button>
            <Button
              onClick={generate}
              disabled={generating || !purpose.trim()}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {generating
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />생성 중...</>
                : <><Sparkles className="h-4 w-4 mr-2" />AI 생성하기</>}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ──────────────────────────────────────────────
// 파일 카드
// ──────────────────────────────────────────────
function FileCard({ file, isAdmin, onDelete }: {
  file: TeamFile
  isAdmin: boolean
  onDelete: (id: string) => void
}) {
  const [generateTarget, setGenerateTarget] = useState<TeamFile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const canGenerate = file.status === "completed" || file.status === "original_expired"

  const handleDelete = async () => {
    if (!confirm(`"${file.original_file_name}" 자료를 삭제하시겠습니까?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/teams/files/${file.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("자료가 삭제되었습니다")
        onDelete(file.id)
      } else {
        const d = await res.json()
        toast.error(d.error ?? "삭제 실패")
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
        <FileText className="h-8 w-8 text-orange-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{file.original_file_name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <StatusBadge status={file.status} />
            <VisibilityBadge visibility={file.visibility} />
            {file.uploader_name && (
              <span className="text-xs text-gray-400">{file.uploader_name} 업로드</span>
            )}
            {file.delete_after && (
              <span className="text-xs text-gray-400">
                {new Date(file.delete_after).toLocaleDateString("ko-KR")} 만료
              </span>
            )}
          </div>
          {file.status === "failed" && file.summary_text && (
            <p className="text-xs text-red-500 mt-0.5">{file.summary_text}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {canGenerate && (
            <Button
              size="sm"
              onClick={() => setGenerateTarget(file)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-7 px-2.5"
            >
              <Sparkles className="h-3 w-3 mr-1" />AI 생성
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="text-gray-400 hover:text-red-500 h-7 w-7 p-0"
            >
              {deleting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {generateTarget && (
        <GenerateModal file={generateTarget} onClose={() => setGenerateTarget(null)} />
      )}
    </>
  )
}

// ──────────────────────────────────────────────
// 업로드 패널 (관리자 전용)
// ──────────────────────────────────────────────
function UploadPanel({ onUploaded }: { onUploaded: () => void }) {
  const [show, setShow] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [visibility, setVisibility] = useState<"team" | "managers_only">("team")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") { toast.error("PDF 파일만 업로드 가능합니다"); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("visibility", visibility)
      const res = await fetch("/api/teams/files", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "업로드 실패"); return }
      if (data.status === "failed") {
        toast.warning(`업로드 완료, 텍스트 추출 실패: ${data.errorMessage}`)
      } else {
        toast.success("자료가 업로드되었습니다")
      }
      setShow(false)
      onUploaded()
    } finally {
      setUploading(false)
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ""
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <Button
        size="sm"
        onClick={() => setShow(v => !v)}
        className="bg-orange-500 hover:bg-orange-600 text-white"
      >
        <Upload className="h-4 w-4 mr-1.5" />자료 업로드
      </Button>

      {show && (
        <div className="mt-3 p-4 border-2 border-dashed border-orange-200 rounded-xl bg-orange-50 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">PDF 자료 업로드</p>
            <button onClick={() => setShow(false)}><X className="h-4 w-4 text-gray-400" /></button>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 shrink-0">공개 범위</label>
            <select
              value={visibility}
              onChange={e => setVisibility(e.target.value as "team" | "managers_only")}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="team">팀 전체</option>
              <option value="managers_only">관리자만</option>
            </select>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver ? "border-orange-400 bg-orange-100" : "border-gray-300 hover:border-orange-300"
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 mx-auto animate-spin text-orange-500 mb-2" />
                <p className="text-sm text-gray-500">업로드 중...</p>
              </>
            ) : (
              <>
                <FileText className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">PDF 파일을 여기에 끌어다 놓거나 클릭하여 선택</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────
export function TeamFileManager() {
  const [files, setFiles] = useState<TeamFile[]>([])
  const [myRole, setMyRole] = useState<TeamRole | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = myRole === "owner" || myRole === "manager"

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/teams/files")
      if (!res.ok) { setFiles([]); return }
      const data = await res.json()
      setFiles(data.files ?? [])
      setMyRole(data.myRole ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = (id: string) => setFiles(prev => prev.filter(f => f.id !== id))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-orange-500" />
            팀 자료함
          </CardTitle>
          {isAdmin && <UploadPanel onUploaded={load} />}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          팀 공유 자료를 업로드하고 AI 설명자료를 생성하세요
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {isAdmin
                ? "업로드 버튼을 눌러 첫 번째 자료를 공유해보세요"
                : "아직 공유된 자료가 없습니다"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(f => (
              <FileCard key={f.id} file={f} isAdmin={isAdmin} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
