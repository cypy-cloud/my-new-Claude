"use client"

import { useState } from "react"
import { MessageSquare, BookOpen, FileText, Copy, Download, Search, Filter, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

const MOCK_RESULTS = [
  { id: "1", type: "ai_message", label: "AI 문자", icon: MessageSquare, color: "blue", title: "생일 축하 메시지", preview: "홍길동 고객님, 생일을 진심으로 축하드립니다! 건강하고 행복한 하루 되세요...", date: "2025-06-29", style: "친근체" },
  { id: "2", type: "ai_script", label: "AI 스크립트", icon: BookOpen, color: "purple", title: "종신보험 신규 계약 스크립트", preview: "[종신보험 상담 스크립트] 오프닝: 안녕하세요, 고객님. 오늘 시간 내주셔서...", date: "2025-06-28", style: "40대" },
  { id: "3", type: "ai_document", label: "AI 설명자료", icon: FileText, color: "orange", title: "암보험 고객용 설명자료", preview: "📋 고객용 보험 설명자료 - 핵심 보장 내용 요약...", date: "2025-06-27", style: "신혼부부" },
  { id: "4", type: "ai_message", label: "AI 문자", icon: MessageSquare, color: "blue", title: "보험 만기 안내 메시지", preview: "안녕하세요, 고객님의 보험이 다음 달 만기를 앞두고 있습니다...", date: "2025-06-26", style: "격식체" },
  { id: "5", type: "ai_script", label: "AI 스크립트", icon: BookOpen, color: "purple", title: "실손보험 해지 방어 스크립트", preview: "[실손보험 해지 방어] 고객님, 잠긄 말씨드려도 될까요?...", date: "2025-06-25", style: "30대" },
]

const iconBgMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
  orange: "bg-orange-100 text-orange-500",
}

const badgeMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
}

export default function MyResultsPage() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

  const filtered = MOCK_RESULTS.filter((r) => {
    const matchSearch = r.title.includes(search) || r.preview.includes(search)
    const matchFilter = filter === "all" || r.type === filter
    return matchSearch && matchFilter
  })

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    toast.success("클립보드에 복사되었습니다")
  }

  function handleDownload(item: typeof MOCK_RESULTS[0]) {
    const blob = new Blob([item.preview], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${item.title}_${item.date}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleBulkDownload() {
    const content = filtered.map((r) => `[${r.title}] (${r.date})\n${r.preview}\n\n`).join("━━━━━━━━━━━━━━━━━━━\n\n")
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `FP_AI_결과물_전체백업_${new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "")}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("전체 백업 다운로드가 시작됩니다")
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">내 결과물 보관함</h1>
          <p className="text-gray-500 mt-1">AI가 생성한 모든 결과물을 확인하고 관리하세요</p>
        </div>
        <Button onClick={handleBulkDownload} className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white self-start sm:self-auto">
          <Download className="h-4 w-4 mr-2" />전체 백업
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="결과물 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {[
            { value: "all", label: "전체" },
            { value: "ai_message", label: "AI 문자" },
            { value: "ai_script", label: "스크립트" },
            { value: "ai_document", label: "설명자료" },
          ].map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-2 rounded-lg text-sm border transition-all flex items-center gap-1.5 ${filter === f.value ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-white text-gray-700 border-gray-200 hover:border-[#1e3a5f]/30"}`}>
              <Filter className="h-3.5 w-3.5" />{f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
          <Archive className="h-12 w-12 text-gray-200" />
          <p className="font-medium">결과물이 없습니다</p>
          <p className="text-sm">AI 기능을 사용하면 결과물이 여기에 저장됩니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgMap[item.color]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-[#1e3a5f] text-sm">{item.title}</span>
                        <Badge className={`text-xs ${badgeMap[item.color]} hover:${badgeMap[item.color]}`}>{item.label}</Badge>
                        <span className="text-xs text-gray-400">{item.style}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{item.preview}</p>
                      <p className="text-xs text-gray-400 mt-1">{item.date}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleCopy(item.preview)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownload(item)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      <p className="text-xs text-gray-400 text-center">전 {filtered.length}개의 결과물</p>
    </div>
  )
}
