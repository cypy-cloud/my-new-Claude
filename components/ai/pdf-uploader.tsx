"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import {
  Upload, FileText, Trash2, Download, AlertCircle, CheckCircle,
  Clock, Loader2, Eye, EyeOff, ShieldAlert, RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { clientTrackEvent } from "@/lib/analytics/client-track"
import { ORIGINAL_DELETED_NOTICE } from "@/lib/files/constants"

interface UploadedFile {
  id: string
  original_file_name: string
  file_size_mb: number
  status: "uploaded" | "processing" | "completed" | "failed" | "deleted" | "original_expired"
  extracted_text: string | null
  summary_text: string | null
  delete_after: string | null
  created_at: string
}

interface Props {
  initialUploadCount: number
  uploadLimit: number
  maxFileSizeMb: number
  storageDays: number
  planName: string
}

function formatDate(iso: string | null): string {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
}

function formatSize(mb: number): string {
  if (mb < 1) return `${(mb * 1024).toFixed(0)}KB`
  return `${mb.toFixed(1)}MB`
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PdfUploader({ initialUploadCount, uploadLimit, maxFileSizeMb, storageDays, planName }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [privacyChecked, setPrivacyChecked] = useState(false)
  const [uploadCount, setUploadCount] = useState(initialUploadCount)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remaining = Math.max(0, uploadLimit - uploadCount)
  const isLimitReached = remaining === 0

  async function loadFiles() {
    setIsLoadingFiles(true)
    try {
      const res = await fetch("/api/files")
      const data = await res.json()
      if (res.ok) setFiles(data.files ?? [])
    } catch {
      toast.error("파일 목록을 불러오지 못했습니다")
    } finally {
      setIsLoadingFiles(false)
    }
  }

  useEffect(() => { loadFiles() }, [])

  const handleUpload = useCallback(async (file: File) => {
    if (!privacyChecked) {
      toast.error("개인정보 확인 체크박스를 먼저 체크해주세요")
      return
    }
    if (isLimitReached) {
      toast.error(`이번 달 업로드 한도(${uploadLimit}개)를 초과했습니다`)
      return
    }
    if (file.type !== "application/pdf") {
      toast.error("PDF 파일만 업로드 가능합니다")
      return
    }
    const fileSizeMb = file.size / (1024 * 1024)
    if (fileSizeMb > maxFileSizeMb) {
      toast.error(`파일 크기가 ${maxFileSizeMb}MB를 초과했습니다 (현재 ${fileSizeMb.toFixed(1)}MB)`)
      return
    }

    setIsUploading(true)
    clientTrackEvent("document_upload_start", { metadata: { fileName: file.name } })

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/files/upload", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "업로드에 실패했습니다")
        return
      }

      if (data.status === "completed") {
        toast.success("PDF 텍스트 추출이 완료되었습니다!")
      } else {
        toast.warning(data.errorMessage ?? "텍스트를 추출할 수 없습니다")
      }

      setUploadCount(c => c + 1)
      await loadFiles()
    } catch {
      toast.error("업로드 중 오류가 발생했습니다")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [privacyChecked, isLimitReached, uploadLimit, maxFileSizeMb])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}"을 삭제하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/files?id=${id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("삭제에 실패했습니다"); return }
      toast.success("삭제되었습니다")
      setFiles(prev => prev.filter(f => f.id !== id))
      if (previewId === id) setPreviewId(null)
    } catch {
      toast.error("삭제 중 오류가 발생했습니다")
    }
  }

  function handleDownload(id: string) {
    const a = document.createElement("a")
    a.href = `/api/files/${id}/download`
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    a.remove()
    clientTrackEvent("result_download", { metadata: { fileId: id, feature: "pdf" } })
  }

  function statusBadge(status: UploadedFile["status"]) {
    switch (status) {
      case "completed":  return <Badge className="text-xs bg-green-100 text-green-700 border-green-200">추출 완료</Badge>
      case "processing": return <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">처리 중</Badge>
      case "failed":     return <Badge className="text-xs bg-red-100 text-red-700 border-red-200">추출 불가</Badge>
      case "original_expired": return <Badge className="text-xs bg-gray-100 text-gray-500 border-gray-200">원본 삭제됨</Badge>
      default:           return <Badge variant="secondary" className="text-xs">업로드됨</Badge>
    }
  }

  const previewFile = files.find(f => f.id === previewId)

  return (
    <div className="space-y-6">
      {/* ── 개인정보 안내 ─────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800">개인정보 업로드 주의</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              고객 이름, 주민등록번호, 연락처, 주소, 증권번호 등 개인정보가 포함된 파일은 업로드하지 마세요.
              필요한 경우 개인정보를 가린 후 업로드해 주세요.
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={privacyChecked}
            onChange={e => setPrivacyChecked(e.target.checked)}
            className="w-4 h-4 rounded border-amber-400 accent-amber-600"
          />
          <span className="text-sm text-amber-800 font-medium">
            개인정보가 포함되지 않았거나, 개인정보를 가린 파일임을 확인했습니다.
          </span>
        </label>
      </div>

      {/* ── 업로드 + 한도 ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 드래그앤드롭 업로드 */}
        <div className="space-y-3">
          <div className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
            isLimitReached ? "bg-red-50 border-red-200 text-red-700" :
            remaining <= 1 ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
            "bg-orange-50 border-orange-100 text-orange-700"
          }`}>
            <span>이번 달 업로드 <strong>{uploadCount}/{uploadLimit}개</strong> <span className="opacity-70">({planName} 플랜)</span></span>
            {isLimitReached && <Badge variant="destructive" className="text-xs">한도 초과</Badge>}
            {!isLimitReached && remaining <= 1 && <Badge className="text-xs bg-yellow-500 text-white">{remaining}개 남음</Badge>}
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isUploading && !isLimitReached && privacyChecked && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              !privacyChecked || isLimitReached
                ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                : dragOver
                ? "border-orange-400 bg-orange-50"
                : "border-orange-200 bg-orange-50/50 hover:border-orange-400 hover:bg-orange-50"
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-orange-400 animate-spin" />
                <p className="text-sm text-orange-700 font-medium">PDF 텍스트 추출 중...</p>
                <p className="text-xs text-orange-500">페이지 수에 따라 최대 10초 소요됩니다</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className={`h-10 w-10 ${dragOver ? "text-orange-500" : "text-orange-300"}`} />
                <div>
                  <p className="text-sm font-medium text-gray-700">PDF 파일을 드래그하거나 클릭하여 업로드</p>
                  <p className="text-xs text-gray-400 mt-1">최대 {maxFileSizeMb}MB · PDF만 가능 · 보관 {storageDays}일</p>
                </div>
                {!privacyChecked && (
                  <p className="text-xs text-amber-600 font-medium">↑ 위 개인정보 확인 체크박스를 먼저 체크해주세요</p>
                )}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileInput}
            disabled={isUploading || isLimitReached || !privacyChecked}
          />

          <Button
            onClick={() => privacyChecked && !isLimitReached && fileInputRef.current?.click()}
            disabled={isUploading || isLimitReached || !privacyChecked}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isUploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />처리 중...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" />PDF 파일 선택</>
            )}
          </Button>
        </div>

        {/* 텍스트 미리보기 */}
        <Card className="min-h-[280px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>추출된 텍스트 미리보기</span>
              {previewFile && (
                <Button variant="ghost" size="sm" onClick={() => setPreviewId(null)} className="h-7 px-2 text-xs">
                  <EyeOff className="h-3.5 w-3.5 mr-1" />닫기
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewFile ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium truncate">{previewFile.original_file_name}</p>
                {previewFile.status === "original_expired" && (
                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{ORIGINAL_DELETED_NOTICE}</span>
                  </div>
                )}
                {(previewFile.status === "completed" || previewFile.status === "original_expired") && previewFile.extracted_text ? (
                  <div className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 bg-gray-50 rounded-lg p-3 max-h-[220px] overflow-y-auto border">
                    {previewFile.extracted_text.slice(0, 2000)}
                    {previewFile.extracted_text.length > 2000 && (
                      <span className="text-gray-400"> ...(이하 생략)</span>
                    )}
                  </div>
                ) : previewFile.status === "failed" ? (
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{previewFile.summary_text ?? "텍스트를 추출할 수 없습니다. 스캔 이미지 PDF는 지원되지 않습니다."}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />처리 중...
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[200px] text-gray-400 space-y-2">
                <Eye className="h-8 w-8 text-gray-200" />
                <p className="text-xs">파일 목록에서 &ldquo;미리보기&rdquo;를 클릭하세요</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 파일 목록 ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">업로드된 파일 목록</h3>
          <Button variant="ghost" size="sm" onClick={loadFiles} className="h-7 px-2 text-xs text-gray-500">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />새로고침
          </Button>
        </div>

        {isLoadingFiles ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">불러오는 중...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-xl border-gray-100">
            <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm">업로드된 파일이 없습니다</p>
            <p className="text-xs mt-1">위에서 PDF를 업로드하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(file => {
              const days = daysUntil(file.delete_after)
              const isExpiringSoon = days !== null && days <= 3
              const isPreview = previewId === file.id

              return (
                <div
                  key={file.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                    isPreview ? "border-orange-300 bg-orange-50" : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                >
                  {/* File icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    file.status === "completed" ? "bg-green-100" :
                    file.status === "failed"    ? "bg-red-100" :
                    "bg-gray-100"
                  }`}>
                    {file.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : file.status === "failed" ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : file.status === "original_expired" ? (
                      <Clock className="h-5 w-5 text-gray-400" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-400" />
                    )}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{file.original_file_name}</p>
                      {statusBadge(file.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      <span>{formatSize(file.file_size_mb)}</span>
                      <span>업로드: {formatDate(file.created_at)}</span>
                      {file.delete_after && file.status !== "original_expired" && (
                        <span className={`flex items-center gap-1 ${isExpiringSoon ? "text-red-500 font-medium" : "text-gray-400"}`}>
                          <Clock className="h-3 w-3" />
                          삭제 예정: {formatDate(file.delete_after)}
                          {days !== null && ` (${days}일 후)`}
                        </span>
                      )}
                    </div>
                    {file.status === "failed" && (
                      <p className="text-xs text-red-500">{file.summary_text ?? "텍스트 추출 불가 (스캔 PDF)"}</p>
                    )}
                    {file.status === "original_expired" && (
                      <p className="text-xs text-gray-500">{ORIGINAL_DELETED_NOTICE}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {(file.status === "completed" || file.status === "original_expired") && (
                      <>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setPreviewId(isPreview ? null : file.id)}
                          className="h-8 px-2 text-xs text-gray-500 hover:text-gray-700"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />{isPreview ? "닫기" : "미리보기"}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleDownload(file.id)}
                          className="h-8 px-2 text-xs text-gray-500 hover:text-gray-700"
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />다운로드
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleDelete(file.id, file.original_file_name)}
                      className="h-8 px-2 text-xs text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
