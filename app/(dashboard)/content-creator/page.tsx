"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Sparkles, Copy, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, FileText, Instagram, Facebook, MessageCircle, Hash, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const PRODUCT_FIELDS = [
  "생명보험", "건강보험", "실손보험", "암보험", "종신보험",
  "자동차보험", "화재보험", "여행보험", "어린이보험", "연금보험",
  "운전자보험", "치아보험", "펫보험", "기타",
]

const TONES = [
  "전문적이고 신뢰감 있는",
  "친근하고 따뜻한",
  "간결하고 정보 중심",
  "공감적이고 감성적인",
  "젊고 트렌디한",
]

const LENGTHS = ["짧게", "보통", "길게"]

interface ContentSections {
  BLOG_TITLES?: string
  BLOG_BODY?: string
  INSTAGRAM?: string
  FACEBOOK?: string
  KAKAO_CHANNEL?: string
  HASHTAGS?: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("복사되었습니다!")
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1.5 text-xs text-gray-500 hover:text-gray-800">
      <Copy className="h-3.5 w-3.5" />
      {copied ? "복사됨" : "복사"}
    </Button>
  )
}

function CollapsibleSection({
  icon: Icon,
  title,
  badge,
  content,
  defaultOpen = true,
  className = "",
}: {
  icon: React.ElementType
  title: string
  badge?: string
  content: string
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`border rounded-xl bg-white overflow-hidden ${className}`}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-orange-500" />
          <span className="font-semibold text-sm text-gray-800">{title}</span>
          {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={content} />
          {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans pt-3">{content}</pre>
        </div>
      )}
    </div>
  )
}

export default function ContentCreatorPage() {
  const [form, setForm] = useState({
    topic: "",
    targetAudience: "",
    productField: "",
    contentLength: "보통",
    tone: "전문적이고 신뢰감 있는",
    keyMessage: "",
    prohibitedExpressions: "",
  })
  const [loading, setLoading] = useState(false)
  const [sections, setSections] = useState<ContentSections | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handleGenerate = async (forceRegenerate = false) => {
    if (!form.topic.trim()) { toast.error("주제를 입력해주세요"); return }
    if (!form.productField) { toast.error("상품 분야를 선택해주세요"); return }
    if (!form.keyMessage.trim()) { toast.error("핵심 메시지를 입력해주세요"); return }

    setLoading(true)
    try {
      const res = await fetch("/api/ai/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, forceRegenerate }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.limitExceeded) {
          toast.error("이번 달 사용 한도를 초과했습니다. 요금제를 업그레이드해주세요.")
        } else {
          toast.error(data.error ?? "콘텐츠 생성에 실패했습니다")
        }
        return
      }
      setSections(data.sections)
      if (data.remaining !== undefined) setRemaining(data.remaining)
      if (data.cached) {
        toast.info("이전에 생성한 콘텐츠를 불러왔습니다. 새로 생성하려면 재생성 버튼을 눌러주세요.")
      } else {
        toast.success("콘텐츠가 생성되었습니다!")
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">블로그·SNS 콘텐츠 생성</h1>
          <p className="text-sm text-gray-500 mt-1">보험 마케팅용 블로그·인스타·페이스북·카카오 콘텐츠를 한 번에 생성합니다</p>
        </div>
        {remaining !== null && (
          <Badge variant="outline" className="text-sm">남은 횟수: {remaining}회</Badge>
        )}
      </div>

      {/* Compliance Warning */}
      <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600" />
        <div>
          <p className="font-semibold mb-1">보험 광고 심의 안내</p>
          <p>생성된 콘텐츠는 초안입니다. 실제 게시 전 <strong>보험업법 및 금융소비자보호법</strong>에 따른 광고 심의를 받아야 할 수 있습니다. 소속 회사의 컴플라이언스 팀에 먼저 확인하세요.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white border rounded-xl p-6 space-y-4 h-fit">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-500" />
            콘텐츠 정보 입력
          </h2>

          <div className="space-y-2">
            <Label>주제 <span className="text-red-500">*</span></Label>
            <Input
              placeholder="예: 30대 직장인을 위한 실손보험 필요성"
              value={form.topic}
              onChange={e => set("topic", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>타깃 고객</Label>
            <Input
              placeholder="예: 30~40대 맞벌이 부부, 자녀가 있는 가정"
              value={form.targetAudience}
              onChange={e => set("targetAudience", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>상품 분야 <span className="text-red-500">*</span></Label>
            <Select value={form.productField} onValueChange={v => set("productField", v)}>
              <SelectTrigger>
                <SelectValue placeholder="상품 분야 선택" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_FIELDS.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>글 길이</Label>
              <Select value={form.contentLength} onValueChange={v => set("contentLength", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LENGTHS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>톤앤매너</Label>
              <Select value={form.tone} onValueChange={v => set("tone", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>핵심 메시지 <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="예: 실손보험은 예상치 못한 의료비 부담을 줄여주는 든든한 대비책입니다"
              value={form.keyMessage}
              onChange={e => set("keyMessage", e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>금지 표현</Label>
            <Input
              placeholder="예: 무조건, 반드시, 100% 보장 (쉼표로 구분)"
              value={form.prohibitedExpressions}
              onChange={e => set("prohibitedExpressions", e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => handleGenerate(false)}
              disabled={loading}
            >
              {loading ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> 생성 중...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> 콘텐츠 생성</>
              )}
            </Button>
            {sections && (
              <Button
                variant="outline"
                onClick={() => handleGenerate(true)}
                disabled={loading}
                title="새로 생성"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Output */}
        <div className="space-y-3">
          {!sections ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">정보를 입력하고 콘텐츠 생성 버튼을 누르면<br />블로그·SNS 콘텐츠가 여기에 표시됩니다</p>
            </div>
          ) : (
            <>
              {sections.BLOG_TITLES && (
                <CollapsibleSection
                  icon={BookOpen}
                  title="블로그 제목 5개"
                  content={sections.BLOG_TITLES}
                />
              )}
              {sections.BLOG_BODY && (
                <CollapsibleSection
                  icon={FileText}
                  title="블로그 본문 초안"
                  badge="메인"
                  content={sections.BLOG_BODY}
                />
              )}
              {sections.INSTAGRAM && (
                <CollapsibleSection
                  icon={Instagram}
                  title="인스타그램"
                  content={sections.INSTAGRAM}
                  defaultOpen={false}
                />
              )}
              {sections.FACEBOOK && (
                <CollapsibleSection
                  icon={Facebook}
                  title="페이스북"
                  content={sections.FACEBOOK}
                  defaultOpen={false}
                />
              )}
              {sections.KAKAO_CHANNEL && (
                <CollapsibleSection
                  icon={MessageCircle}
                  title="카카오채널"
                  content={sections.KAKAO_CHANNEL}
                  defaultOpen={false}
                />
              )}
              {sections.HASHTAGS && (
                <CollapsibleSection
                  icon={Hash}
                  title="해시태그"
                  content={sections.HASHTAGS}
                  defaultOpen={false}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
