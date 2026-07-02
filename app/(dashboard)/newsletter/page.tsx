"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Sparkles, Copy, RefreshCw, ChevronDown, ChevronUp,
  AlertTriangle, Save, Download, Mail, MessageCircle,
  FileText, CheckSquare, MousePointerClick, BookOpen, Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

// ─── Constants ──────────────────────────────────────────────────────────────

const INSURANCE_FIELDS = [
  "생명보험", "건강보험", "실손보험", "암보험", "종신보험",
  "자동차보험", "화재보험", "연금보험", "어린이보험", "운전자보험",
  "치아보험", "펫보험", "복합 (여러 분야)", "기타",
]

const TONES = [
  "전문적이고 따뜻한",
  "친근하고 편안한",
  "정보 중심 / 실용적",
  "공감적이고 감성적인",
  "격식 있고 신뢰감 있는",
]

const LENGTHS = ["짧게", "보통", "길게"]

const SECTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  TITLE:        { label: "뉴스레터 제목",        icon: Mail,              color: "text-blue-600" },
  GREETING:     { label: "인사말",               icon: BookOpen,          color: "text-green-600" },
  ISSUE_1:      { label: "핵심 이슈 1",           icon: FileText,          color: "text-orange-600" },
  ISSUE_2:      { label: "핵심 이슈 2",           icon: FileText,          color: "text-orange-600" },
  ISSUE_3:      { label: "핵심 이슈 3",           icon: FileText,          color: "text-orange-600" },
  CHECK_POINTS: { label: "보험 점검 포인트",       icon: CheckSquare,       color: "text-purple-600" },
  CTA:          { label: "고객 행동 유도 문구",    icon: MousePointerClick, color: "text-red-600" },
  KAKAO_SUMMARY:{ label: "카톡 발송용 요약",       icon: MessageCircle,     color: "text-yellow-600" },
}

const SECTION_ORDER = ['TITLE', 'GREETING', 'ISSUE_1', 'ISSUE_2', 'ISSUE_3', 'CHECK_POINTS', 'CTA', 'KAKAO_SUMMARY']

// ─── Helpers ────────────────────────────────────────────────────────────────

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function buildFullText(sections: Record<string, string>, topic: string): string {
  const lines: string[] = [`===== 뉴스레터: ${topic} =====\n`]
  for (const key of SECTION_ORDER) {
    if (!sections[key]) continue
    const meta = SECTION_META[key]
    lines.push(`\n【${meta.label}】`)
    lines.push(sections[key])
  }
  lines.push('\n\n' + '='.repeat(40))
  lines.push('※ 이 뉴스레터는 AI 초안입니다. 실제 발송 전 내용을 검토하고 컴플라이언스 확인을 받으세요.')
  return lines.join('\n')
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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

function SectionCard({
  sectionKey,
  content,
  defaultOpen = true,
}: {
  sectionKey: string
  content: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const meta = SECTION_META[sectionKey]
  if (!meta) return null
  const Icon = meta.icon

  return (
    <div className="border rounded-xl bg-white overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${meta.color}`} />
          <span className="font-semibold text-sm text-gray-800">{meta.label}</span>
        </div>
        <div className="flex items-center gap-1">
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function NewsletterPage() {
  const [form, setForm] = useState({
    targetAudience: "",
    topic: "",
    insuranceField: "",
    seasonalIssue: "",
    recentConsultingIssue: "",
    tone: "전문적이고 따뜻한",
    length: "보통",
    userProvidedInfo: "",
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sections, setSections] = useState<Record<string, string> | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handleGenerate = async (forceRegenerate = false) => {
    if (!form.targetAudience.trim()) { toast.error("대상 고객층을 입력해주세요"); return }
    if (!form.topic.trim()) { toast.error("뉴스레터 주제를 입력해주세요"); return }
    if (!form.insuranceField) { toast.error("보험 분야를 선택해주세요"); return }

    setLoading(true)
    setSavedId(null)
    try {
      const res = await fetch("/api/ai/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, forceRegenerate }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.limitExceeded) {
          toast.error("이번 달 사용 한도를 초과했습니다. 요금제를 업그레이드해주세요.")
        } else {
          toast.error(data.error ?? "뉴스레터 생성에 실패했습니다")
        }
        return
      }
      setSections(data.sections)
      if (data.remaining !== undefined) setRemaining(data.remaining)
      if (data.cached) {
        toast.info("이전에 생성한 뉴스레터를 불러왔습니다.")
      } else {
        toast.success("뉴스레터가 생성되었습니다!")
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!sections) return
    setSaving(true)
    try {
      const fullText = buildFullText(sections, form.topic)
      const title = sections.TITLE ? `[뉴스레터] ${sections.TITLE}` : `[뉴스레터] ${form.topic}`
      const res = await fetch("/api/outputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "newsletter",
          title,
          inputData: form,
          outputText: fullText,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error("보관함 저장에 실패했습니다"); return }
      setSavedId(data.id)
      toast.success("보관함에 저장되었습니다!")
    } catch {
      toast.error("저장 중 오류가 발생했습니다")
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = () => {
    if (!sections) return
    const fullText = buildFullText(sections, form.topic)
    const filename = `뉴스레터_${form.topic}_${new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')}.txt`
    downloadText(fullText, filename)
    toast.success("다운로드가 시작되었습니다")
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">뉴스레터 생성</h1>
          <p className="text-sm text-gray-500 mt-1">고객에게 발송할 월간·주간 뉴스레터 초안을 AI로 생성합니다</p>
        </div>
        {remaining !== null && (
          <Badge variant="outline" className="text-sm">남은 횟수: {remaining}회</Badge>
        )}
      </div>

      {/* AI Info Warning */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
        <div>
          <p className="font-semibold mb-1">AI 정보 정확도 안내</p>
          <p>AI는 최신 법령, 금리, 통계 수치를 정확히 알 수 없습니다. 생성된 초안에서 <strong>[확인 필요]</strong> 표시가 있는 부분은 반드시 공식 출처(금융감독원, 생명·손해보험협회)에서 직접 확인하세요. 정확한 수치나 최신 정보가 있다면 아래 "참고 자료" 란에 직접 입력해 주세요.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white border rounded-xl p-6 space-y-4 h-fit">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-500" />
            뉴스레터 정보 입력
          </h2>

          <div className="space-y-2">
            <Label>대상 고객층 <span className="text-red-500">*</span></Label>
            <Input
              placeholder="예: 40~50대 가정주부, 자녀를 둔 맞벌이 부부"
              value={form.targetAudience}
              onChange={e => set("targetAudience", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>뉴스레터 주제 <span className="text-red-500">*</span></Label>
            <Input
              placeholder="예: 여름철 건강보험 점검, 연말 절세 전략"
              value={form.topic}
              onChange={e => set("topic", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>보험 분야 <span className="text-red-500">*</span></Label>
            <select
              value={form.insuranceField}
              onChange={e => set("insuranceField", e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">보험 분야 선택</option>
              {INSURANCE_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>계절/시기 이슈</Label>
            <Input
              placeholder="예: 여름 폭염, 연말 정산 시즌, 신학기"
              value={form.seasonalIssue}
              onChange={e => set("seasonalIssue", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>최근 상담 이슈</Label>
            <Input
              placeholder="예: 실손 청구 절차 문의 많음, 갱신형 전환 상담"
              value={form.recentConsultingIssue}
              onChange={e => set("recentConsultingIssue", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>톤앤매너</Label>
              <select
                value={form.tone}
                onChange={e => set("tone", e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>길이</Label>
              <select
                value={form.length}
                onChange={e => set("length", e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {LENGTHS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              직접 제공하는 참고 자료
              <Badge variant="outline" className="text-xs font-normal">AI가 이 정보만 사실로 사용</Badge>
            </Label>
            <Textarea
              placeholder="예: 2024년 실손보험 자기부담금 20%로 변경 예정 (금감원 발표). 올해 암 발병률 전년 대비 3.2% 증가 (통계청 자료)."
              value={form.userProvidedInfo}
              onChange={e => set("userProvidedInfo", e.target.value)}
              rows={3}
            />
            <p className="text-xs text-gray-400">최신 뉴스, 통계, 법령 변경사항 등 직접 확인한 정보를 입력하면 더 정확한 뉴스레터가 생성됩니다.</p>
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
                <><Sparkles className="h-4 w-4 mr-2" /> 뉴스레터 생성</>
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
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">정보를 입력하고 뉴스레터 생성 버튼을 누르면<br />8개 섹션의 뉴스레터 초안이 여기에 표시됩니다</p>
            </div>
          ) : (
            <>
              {/* Save / Download Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={handleSave}
                  disabled={saving || !!savedId}
                >
                  <Save className="h-4 w-4" />
                  {savedId ? "보관함 저장됨" : saving ? "저장 중..." : "보관함에 저장"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                  TXT 다운로드
                </Button>
                <CopyButton text={buildFullText(sections, form.topic)} />
              </div>

              {/* Compliance Warning */}
              <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                <p>초안입니다. 발송 전 내용 검토 및 컴플라이언스 확인 필수. <strong>[확인 필요]</strong> 표시는 직접 수치를 확인하세요.</p>
              </div>

              {SECTION_ORDER.map((key, idx) =>
                sections[key] ? (
                  <SectionCard
                    key={key}
                    sectionKey={key}
                    content={sections[key]}
                    defaultOpen={idx < 3}
                  />
                ) : null
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
