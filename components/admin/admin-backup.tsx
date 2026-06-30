"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Database, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface BackupLog {
  id: string
  user_id: string | null
  backup_type: "user_zip" | "admin_csv" | "system"
  status: "processing" | "completed" | "failed"
  file_path: string | null
  created_at: string
}

const EXPORT_OPTIONS: { type: string; label: string }[] = [
  { type: "files", label: "업로드 파일 목록" },
  { type: "outputs", label: "생성 결과물" },
  { type: "usage", label: "사용량 기록" },
  { type: "errors", label: "에러 로그" },
]

const TYPE_LABELS: Record<string, string> = {
  user_zip: "사용자 ZIP",
  admin_csv: "관리자 CSV",
  system: "시스템",
}

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-green-100 text-green-700 border-green-200",
  processing: "bg-amber-100 text-amber-700 border-amber-200",
  failed: "bg-red-100 text-red-700 border-red-200",
}

export function AdminBackup() {
  const [logs, setLogs] = useState<BackupLog[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/export?logs=1")
    const data = await res.json()
    setLogs(data.logs ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadLogs() }, [loadLogs])

  async function runExport(type: string, label: string) {
    setExporting(type)
    try {
      const res = await fetch(`/api/admin/export?type=${type}`)
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.detail ?? data.error ?? "내보내기 실패")
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = disposition.match(/filename\*=UTF-8''(.+)$/)
      const fileName = match ? decodeURIComponent(match[1]) : `${label}.csv`

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)

      toast.success(`${label} CSV 내보내기가 완료되었습니다`)
      loadLogs()
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
          <Database className="h-5 w-5" /> 데이터 백업 및 내보내기
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          관리자용 데이터를 CSV로 내보내거나, 최근 백업 이력을 확인할 수 있습니다.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">관리자 데이터 내보내기 (CSV)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {EXPORT_OPTIONS.map((opt) => (
              <Button
                key={opt.type}
                onClick={() => runExport(opt.type, opt.label)}
                disabled={exporting !== null}
                variant="outline"
                className="flex flex-col h-auto py-4 gap-1.5 border-gray-200"
              >
                {exporting === opt.type ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 text-orange-500" />
                )}
                <span className="text-xs text-[#1e3a5f]">{opt.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">최근 백업 이력</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 py-6">
              <Loader2 className="h-5 w-5 animate-spin" /> 조회 중...
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-400 py-6">백업 이력이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{TYPE_LABELS[log.backup_type]}</Badge>
                    <span className="text-sm text-gray-600">{log.file_path ?? "-"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`text-xs border ${STATUS_BADGE[log.status]}`}>{log.status}</Badge>
                    <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString("ko-KR")}</span>
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
