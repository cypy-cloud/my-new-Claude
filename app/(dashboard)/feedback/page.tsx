"use client"

import { useState } from "react"
import { toast } from "sonner"
import { clientTrackEvent } from "@/lib/analytics/client-track"
import { MessageCircle, Star, Send, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CATEGORIES = [
  { value: "feature", label: "🚀 기능 제안" },
  { value: "bug", label: "🐛 버그 신고" },
  { value: "ui", label: "🎨 UI/UX 개선" },
  { value: "general", label: "💬 일반 문의" },
]

export default function FeedbackPage() {
  const [category, setCategory] = useState("")
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category) { toast.error("카테고리를 선택해주세요"); return }
    if (!content.trim()) { toast.error("내용을 입력해주세요"); return }

    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    clientTrackEvent('feedback_submit', { metadata: { category, rating } })
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#1e3a5f] mb-3">피드백 감사합니다!</h2>
        <p className="text-gray-500 mb-6">소중한 의견을 보내주셔서 감사합니다.<br />빠른 시일 내에 검토 후 반영하겠습니다.</p>
        <Button onClick={() => { setSubmitted(false); setCategory(""); setRating(0); setTitle(""); setContent("") }} variant="outline">
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
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#1e3a5f]">서비스 만족도</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${star <= (hoverRating || rating) ? "text-orange-400 fill-orange-400" : "text-gray-300"}`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  {["", "매우 불만족", "불만족", "보통", "만족", "매우 만족"][rating]}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label className="text-sm font-medium">카테고리 <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`px-4 py-3 rounded-xl text-sm border text-left transition-all ${category === c.value ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-white text-gray-700 border-gray-200 hover:border-[#1e3a5f]/30"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">제목 <span className="text-gray-400 font-normal">(선택)</span></Label>
          <Input id="title" placeholder="피드백 제목을 입력하세요" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content" className="text-sm font-medium">내용 <span className="text-red-500">*</span></Label>
          <Textarea
            id="content"
            placeholder="자세한 내용을 입력해주세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-none"
          />
          <p className="text-xs text-gray-400 text-right">{content.length}/500자</p>
        </div>

        <Button type="submit" disabled={loading} className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600 text-white">
          {loading ? "전송 중..." : <><Send className="mr-2 h-4 w-4" />피드백 전송</>}
        </Button>
      </form>
    </div>
  )
}
