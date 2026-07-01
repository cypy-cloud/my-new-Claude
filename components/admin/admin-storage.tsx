"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, HardDrive, FileX2, AlertTriangle } from "lucide-react"

interface StorageData {
  totalFiles: number
  totalBytes: number
  expiredFiles: ExpiredFile[]
  expiredCount: number
  largestFiles: LargeFile[]
}

interface ExpiredFile {
  id: string
  file_name: string
  file_size: number
  user_id: string
  expires_at: string
}

interface LargeFile {
  id: string
  file_name: string
  file_size: number
  user_id: string
  created_at: string
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export function AdminStorage() {
  const [data, setData] = useState<StorageData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/storage')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
  if (!data) return <div className="text-center py-12 text-gray-400">데이터 로드 실패</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
          <HardDrive className="h-5 w-5" /> 저장공간 사용량
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">업로드된 파일 현황 및 삭제 예정 파일</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-[#1e3a5f]">{data.totalFiles.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">전체 파일 수</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-[#1e3a5f]">{formatBytes(data.totalBytes)}</div>
            <div className="text-sm text-gray-500 mt-1">전체 저장용량</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-red-100">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-500">{data.expiredCount}</div>
            <div className="text-sm text-gray-500 mt-1">삭제 예정 파일</div>
          </CardContent>
        </Card>
      </div>

      {/* 삭제 예정 파일 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" /> 삭제 예정 파일 (만료됨)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.expiredFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">삭제 예정 파일 없음</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['파일명', '크기', '사용자 ID', '만료일시'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.expiredFiles.map(f => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs max-w-[200px] truncate" title={f.file_name}>{f.file_name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatBytes(f.file_size ?? 0)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">{f.user_id.slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-xs text-red-500">
                        {new Date(f.expires_at).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 대용량 파일 TOP 20 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
            <FileX2 className="h-4 w-4" /> 대용량 파일 TOP 20
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['파일명', '크기', '사용자 ID', '업로드일'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.largestFiles.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">파일 없음</td></tr>
                ) : data.largestFiles.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate" title={f.file_name}>{f.file_name}</td>
                    <td className="px-4 py-3 text-xs font-medium text-orange-600">{formatBytes(f.file_size ?? 0)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">{f.user_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(f.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" onClick={load}>새로고침</Button>
    </div>
  )
}
