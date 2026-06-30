"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileX2, Loader2, Trash2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

export function AdminFileCleanup() {
  const [expiredCount, setExpiredCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [cleaning, setCleaning] = useState(false)
  const [lastResult, setLastResult] = useState<{ checked: number; deleted: number; failed: number } | null>(null)

  const loadCount = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/cleanup-files')
    const data = await res.json()
    setExpiredCount(data.expiredCount ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => { loadCount() }, [loadCount])

  async function runCleanup() {
    setCleaning(true)
    const res = await fetch('/api/admin/cleanup-files', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? '정리 실패')
      setCleaning(false)
      return
    }
    setLastResult(data)
    toast.success(`원본 PDF ${data.deleted}건이 정리되었습니다`)
    setCleaning(false)
    loadCount()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
          <FileX2 className="h-5 w-5" /> 원본 PDF 보관 기간 관리
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          요금제별 보관 기간(무료 7일 · 기본 30일 · 프로 180일 · 프리미엄 365일)이 지난 원본 PDF를 정리합니다.
          추출된 텍스트, 요약, AI 생성 결과물은 삭제되지 않습니다.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">삭제 대상</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 py-6">
              <Loader2 className="h-5 w-5 animate-spin" /> 조회 중...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {expiredCount === 0 ? (
                  <ShieldCheck className="h-8 w-8 text-green-500" />
                ) : (
                  <FileX2 className="h-8 w-8 text-orange-500" />
                )}
                <div>
                  <p className="text-2xl font-bold text-[#1e3a5f]">{expiredCount ?? 0}건</p>
                  <p className="text-xs text-gray-400">보관 기간이 지나 원본 삭제 대상인 파일</p>
                </div>
              </div>
              <Button
                onClick={runCleanup}
                disabled={cleaning || !expiredCount}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {cleaning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                지금 정리하기
              </Button>
              {lastResult && (
                <p className="text-xs text-gray-500">
                  마지막 실행 결과: 대상 {lastResult.checked}건 중 {lastResult.deleted}건 정리 완료
                  {lastResult.failed > 0 && `, ${lastResult.failed}건 실패`}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
