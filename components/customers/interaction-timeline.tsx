"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Phone, Users as UsersIcon, MessageCircle, MessageSquare, FileSignature,
  Send, StickyNote, Plus, Calendar, Trash2, ThumbsUp, ThumbsDown, Minus,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  INTERACTION_TYPE_LABELS, INTERACTION_SENTIMENT_LABELS,
  type CustomerInteraction, type InteractionType, type InteractionSentiment,
} from "@/types"

const TYPE_ICONS: Record<InteractionType, React.ElementType> = {
  call: Phone,
  meeting: UsersIcon,
  kakao: MessageCircle,
  sms: MessageSquare,
  contract: FileSignature,
  followup: Send,
  memo: StickyNote,
}

const SENTIMENT_ICONS: Record<InteractionSentiment, React.ElementType> = {
  positive: ThumbsUp,
  neutral: Minus,
  negative: ThumbsDown,
  unknown: Minus,
}

const SENTIMENT_COLOR: Record<InteractionSentiment, string> = {
  positive: "text-green-600 bg-green-50 border-green-200",
  neutral: "text-gray-500 bg-gray-50 border-gray-200",
  negative: "text-red-600 bg-red-50 border-red-200",
  unknown: "text-gray-400 bg-gray-50 border-gray-200",
}

const INTERACTION_TYPES: InteractionType[] = ["call", "meeting", "kakao", "sms", "contract", "followup", "memo"]
const SENTIMENTS: InteractionSentiment[] = ["positive", "neutral", "negative", "unknown"]

const selectClass =
  "w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"

function isOverdue(dateStr: string) {
  return new Date(dateStr) < new Date(new Date().toDateString())
}

export function InteractionTimeline({ customerId }: { customerId: string }) {
  const [interactions, setInteractions] = useState<CustomerInteraction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [interactionType, setInteractionType] = useState<InteractionType>("call")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [nextAction, setNextAction] = useState("")
  const [nextActionDate, setNextActionDate] = useState("")
  const [sentiment, setSentiment] = useState<InteractionSentiment>("unknown")

  const fetchInteractions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/interactions`)
      const data = await res.json()
      setInteractions(data.interactions ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [customerId])

  useEffect(() => { fetchInteractions() }, [fetchInteractions])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error("제목을 입력해주세요"); return }
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interactionType, title, content, nextAction, nextActionDate, sentiment }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("상담 이력이 등록되었습니다")
      setTitle(""); setContent(""); setNextAction(""); setNextActionDate(""); setSentiment("unknown")
      setShowForm(false)
      fetchInteractions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "등록에 실패했습니다")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 상담 이력을 삭제하시겠습니까?")) return
    try {
      const res = await fetch(`/api/interactions/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("삭제되었습니다")
      setInteractions(prev => prev.filter(i => i.id !== id))
    } catch {
      toast.error("삭제에 실패했습니다")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">상담 이력</h3>
        <Button size="sm" onClick={() => setShowForm(v => !v)} className="bg-[#1e3a5f] hover:bg-[#162d4a] h-8 text-xs">
          <Plus className="mr-1 h-3.5 w-3.5" />상담 이력 추가
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">상담 유형</Label>
              <select className={selectClass} value={interactionType} onChange={e => setInteractionType(e.target.value as InteractionType)} disabled={isSubmitting}>
                {INTERACTION_TYPES.map(t => <option key={t} value={t}>{INTERACTION_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">고객 반응</Label>
              <select className={selectClass} value={sentiment} onChange={e => setSentiment(e.target.value as InteractionSentiment)} disabled={isSubmitting}>
                {SENTIMENTS.map(s => <option key={s} value={s}>{INTERACTION_SENTIMENT_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">제목 <span className="text-red-500">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 1차 상담 - 종신보험 안내" disabled={isSubmitting} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">상담 내용</Label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="예: 보험료 부담을 느낌, 자녀 교육비와 비교해서 설명 필요. (※ 민감정보는 입력하지 마세요)"
              className="min-h-[70px] resize-none text-sm"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">다음 액션</Label>
              <Input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="예: 비교 자료 보내고 재상담" disabled={isSubmitting} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">후속 연락 예정일</Label>
              <Input type="date" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} disabled={isSubmitting} />
            </div>
          </div>

          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>주민등록번호, 계좌번호, 건강정보 등 민감정보는 입력하지 마세요.</span>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#162d4a]">저장</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)} disabled={isSubmitting}>취소</Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">불러오는 중...</p>
      ) : interactions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">등록된 상담 이력이 없습니다</p>
      ) : (
        <div className="relative pl-6 space-y-5">
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200" />
          {interactions.map(i => {
            const Icon = TYPE_ICONS[i.interaction_type]
            const SentimentIcon = SENTIMENT_ICONS[i.sentiment]
            const overdue = !!i.next_action_date && isOverdue(i.next_action_date)
            return (
              <div key={i.id} className="relative">
                <div className="absolute -left-6 top-0.5 w-[19px] h-[19px] rounded-full bg-white border-2 border-[#1e3a5f] flex items-center justify-center">
                  <Icon className="h-2.5 w-2.5 text-[#1e3a5f]" />
                </div>
                <div className="bg-white border rounded-lg p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-gray-400">{INTERACTION_TYPE_LABELS[i.interaction_type]}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{new Date(i.created_at).toLocaleDateString("ko-KR")}</span>
                        <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border ${SENTIMENT_COLOR[i.sentiment]}`}>
                          <SentimentIcon className="h-2.5 w-2.5" />{INTERACTION_SENTIMENT_LABELS[i.sentiment]}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{i.title}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(i.id)} className="h-6 w-6 p-0 text-gray-300 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {i.content && <p className="text-sm text-gray-600 whitespace-pre-wrap">{i.content}</p>}

                  {(i.next_action || i.next_action_date) && (
                    <div className={`flex items-start gap-1.5 text-xs p-2 rounded border ${overdue ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-blue-50 border-blue-100 text-blue-700"}`}>
                      <Calendar className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>
                        {i.next_action && <>다음 액션: {i.next_action}</>}
                        {i.next_action_date && (
                          <> {i.next_action && "·"} 예정일: {new Date(i.next_action_date).toLocaleDateString("ko-KR")} {overdue && "(기한 지남)"}</>
                        )}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Link href={`/ai-message?customerId=${customerId}&interactionId=${i.id}`}>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                        AI 후속 문자 생성
                      </Button>
                    </Link>
                    <Link href={`/ai-script?customerId=${customerId}&interactionId=${i.id}`}>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-purple-600 border-purple-200 hover:bg-purple-50">
                        반론처리 스크립트 생성
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
