"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { clientTrackEvent } from "@/lib/analytics/client-track"
import { MessageCircle, Send, CheckCircle, Loader2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FEEDBACK_CATEGORY_LABELS, FEEDBACK_STATUS_LABELS,
  type FeedbackCategory, type FeedbackStatus,
} from "@/types"

const CATEGORIES = Object.entries(FEEDBACK_CATEGORY_LABELS) as [FeedbackCategory, string][]

const STATUS_BADGE: Record<FeedbackStatus, string> = {
  open: "bg-gray-100 text-gray-600",
  reviewing: "bg-blue-100 text-blue-600",
  planned: "bg-purple-100 text-purple-600",
  resolved: "bg-green-100 text-green-600",
  closed: "bg-gray-200 text-gray-500",
}

interface MyFeedback {
  id: string
  category: FeedbackCategory
  title: string | null
  content: string
  status: FeedbackStatus
  created_at: string
}

export default function FeedbackPage() {
  const [category, setCategory] = useState<FeedbackCategory | "">("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const [list, setList] = useState<MyFeedback[]>([])
  const [listLoading, setListLoading] = useState(true)

  const loadList = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await fetch("/api/feedback")
      const data = await res.json()
      setList(data.feedback ?? [])
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => { loadList() }, [loadList])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category) { toast.error("카테고리를 선택해주세요"); return }
    if (!content.trim()) { toast.error("내용을 입력해주세요"); return }

    setLoading(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, content }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "전송에 실패했습니다"); setLoading(false); return }

      clientTrackEvent('feedback_submit', { metadata: { category } })
      setSubmitted(true)
      await loadList()
    } catch {
      toast.error("전송에 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#1e3a5f] mb-3">피드백 감사합니다!</h2>
        <p className="text-gray-500 mb-6">소중한 의견을 보내주셔서 감사합니다.<br />빠른 시일 내에 검토 후 반영하겠습니다.</p>
        <Button onClick={() => { setSubmitted(false); setCategory(""); setTitle(""); setContent("") }} variant="outline">
          새 피드백 작성
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
          <MessageCircle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">고객 피드백</h1>
          <p className="text-gray-500 text-sm">서비스 개선을 위한 소중한 의견을 보내주세요</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">카테고리 <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`px-4 py-3 rounded-xl text-sm border text-left transition-all ${category === value ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-white text-gray-700 border-gray-200 hover:border-[#1e3a5f]/30"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">제목 <span className="text-gray-400 font-normal">(선택)</span></Label>
          <Input id="title" placeholder="피드백 제목을 입력하세요" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" maxLength={100} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content" className="text-sm font-medium">내용 <span className="text-red-500">*</span></Label>
          <Textarea
            id="content"
            placeholder="자세한 내용을 입력해주세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-none"
            maxLength={2000}
          />
          <p className="text-xs text-gray-400 text-right">{content.length}/2000자</p>
        </div>

        <Button type="submit" disabled={loading} className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600 text-white">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Send className="mr-2 h-4 w-4" />피드백 전송</>}
        </Button>
      </form>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f]">내가 보낸 피드백 ({list.length}건)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {listLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : list.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">아직 보낸 피드백이 없습니다</div>
          ) : (
            <div className="divide-y">
              {list.map((f) => (
                <div key={f.id} className="px-6 py-4">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={`text-xs ${STATUS_BADGE[f.status]}`}>{FEEDBACK_STATUS_LABELS[f.status]}</Badge>
                    <Badge className="text-xs bg-gray-50 text-gray-500 border border-gray-200">
                      {FEEDBACK_CATEGORY_LABELS[f.category]}
                    </Badge>
                  </div>
                  {f.title && <p className="text-sm font-medium text-gray-800">{f.title}</p>}
                  <p className="text-sm text-gray-500 mt-0.5 whitespace-pre-wrap">{f.content}</p>
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(f.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
