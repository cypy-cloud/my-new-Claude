"use client"

import { useState } from "react"
import { Star, ThumbsUp, ThumbsDown, MessageSquare, ChevronDown, ChevronUp, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const ISSUE_TYPES = [
  { value: 'useful',           label: '👍 유용해요' },
  { value: 'awkward',          label: '😐 어색해요' },
  { value: 'inaccurate',       label: '❌ 내용이 틀려요' },
  { value: 'too_long',         label: '📏 너무 길어요' },
  { value: 'too_short',        label: '📏 너무 짧아요' },
  { value: 'compliance_risk',  label: '⚠️ 컴플라이언스 위험' },
  { value: 'other',            label: '💬 기타' },
]

const FEATURE_LABELS: Record<string, string> = {
  ai_message:  'AI 문자',
  ai_script:   'AI 스크립트',
  ai_document: 'AI 문서',
  ai_followup: '팔로업',
}

interface Props {
  featureType: string
  outputId?: string | null
  promptVersion?: string | null
}

export function OutputRater({ featureType, outputId, promptVersion }: Props) {
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null)
  const [issueType, setIssueType] = useState<string>('')
  const [feedbackText, setFeedbackText] = useState('')
  const [showDetail, setShowDetail] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const displayRating = hoverRating || rating
  const featureLabel = FEATURE_LABELS[featureType] ?? featureType

  async function handleSubmit() {
    if (rating === 0) { toast.error('별점을 선택해주세요'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outputId: outputId ?? undefined,
          featureType,
          promptVersion: promptVersion ?? undefined,
          rating,
          isHelpful: isHelpful ?? undefined,
          feedbackText: feedbackText.trim() || undefined,
          issueType: issueType || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
      toast.success('평가해주셔서 감사합니다!')
    } catch {
      toast.error('평가 저장에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm py-3 px-4 bg-green-50 rounded-xl border border-green-100">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span>평가를 보내주셨습니다. 프롬프트 개선에 활용하겠습니다!</span>
      </div>
    )
  }

  return (
    <div className="border border-gray-100 rounded-xl bg-gray-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
        <Star className="h-3.5 w-3.5 text-yellow-400" />
        {featureLabel} 결과물 평가
      </p>

      {/* 별점 */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            onMouseEnter={() => setHoverRating(s)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => { setRating(s); setShowDetail(true) }}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                s <= displayRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-gray-600">
            {['', '별로예요', '아쉬워요', '보통이에요', '좋아요', '최고예요'][rating]}
          </span>
        )}
      </div>

      {/* 도움됐어요 / 아쉬워요 */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsHelpful(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
            isHelpful === true
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" /> 도움됐어요
        </button>
        <button
          onClick={() => setIsHelpful(false)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
            isHelpful === false
              ? 'bg-red-500 text-white border-red-500'
              : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
          }`}
        >
          <ThumbsDown className="h-3.5 w-3.5" /> 아쉬워요
        </button>

        <button
          onClick={() => setShowDetail(v => !v)}
          className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          의견 남기기
          {showDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* 상세 의견 (펼침) */}
      {showDetail && (
        <div className="space-y-3 pt-1">
          {/* 문제 유형 선택 */}
          <div className="flex flex-wrap gap-1.5">
            {ISSUE_TYPES.map(it => (
              <button
                key={it.value}
                onClick={() => setIssueType(prev => prev === it.value ? '' : it.value)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  issueType === it.value
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {it.label}
              </button>
            ))}
          </div>

          {/* 자유 의견 */}
          <Textarea
            placeholder="개선 의견을 자유롭게 입력해주세요. (선택)"
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            className="min-h-[70px] resize-none text-sm"
          />
        </div>
      )}

      {/* 제출 버튼 */}
      {(rating > 0 || isHelpful !== null) && (
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-xs h-8"
        >
          {submitting ? '저장 중...' : '평가 제출'}
        </Button>
      )}
    </div>
  )
}
