"use client"

import { useEffect, useRef, useState } from "react"
import { toPng, toJpeg } from "html-to-image"
import { toast } from "sonner"
import { ImageIcon, Download, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NEWSLETTER_TEMPLATES, type NewsletterTemplateId } from "@/components/newsletter/templates"
import { NEWSLETTER_FONTS, getNewsletterFontClassName, type NewsletterFontId } from "@/components/newsletter/fonts"

interface NewsletterImagePanelProps {
  sections: Record<string, string>
  topic: string
}

function defaultIssueLabel() {
  const now = new Date()
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월호`
}

export function NewsletterImagePanel({ sections, topic }: NewsletterImagePanelProps) {
  const [open, setOpen] = useState(false)
  const [templateId, setTemplateId] = useState<NewsletterTemplateId>('minimal')
  const [fontId, setFontId] = useState<NewsletterFontId>('sans')
  const [downloading, setDownloading] = useState<'png' | 'jpeg' | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const [fields, setFields] = useState({
    issueLabel: defaultIssueLabel(),
    title: '',
    agentName: '',
    agentContact: '',
    greeting: '',
    issue1: '',
    issue2: '',
    issue3: '',
    checkPoints: '',
    cta: '',
  })

  // 패널을 열 때마다 AI가 생성한 최신 섹션 내용으로 편집 필드를 다시 채운다.
  useEffect(() => {
    if (!open) return
    setFields(prev => ({
      ...prev,
      title: sections.TITLE ?? topic,
      greeting: sections.GREETING ?? '',
      issue1: sections.ISSUE_1 ?? '',
      issue2: sections.ISSUE_2 ?? '',
      issue3: sections.ISSUE_3 ?? '',
      checkPoints: sections.CHECK_POINTS ?? '',
      cta: sections.CTA ?? '',
    }))
  }, [open, sections, topic])

  const set = (key: keyof typeof fields, value: string) => setFields(prev => ({ ...prev, [key]: value }))

  const template = NEWSLETTER_TEMPLATES.find(t => t.id === templateId) ?? NEWSLETTER_TEMPLATES[0]
  const TemplateComponent = template.component

  // 내용이 많을수록 본문 글자 크기를 단계적으로 줄여서, 한 장 안에 잘리지 않고
  // 자연스러운 비율로 다 들어가도록 한다 (제목 크기는 템플릿 정체성 유지를 위해 고정).
  const totalChars = [fields.greeting, fields.issue1, fields.issue2, fields.issue3, fields.checkPoints, fields.cta]
    .join('').length
  const bodyFontSize =
    totalChars > 2200 ? '11.5px' :
    totalChars > 1500 ? '12.5px' :
    totalChars > 900 ? '13.5px' :
    '15px'

  const templateData = {
    issueLabel: fields.issueLabel,
    title: fields.title,
    agentName: fields.agentName || '담당 FP',
    agentContact: fields.agentContact || '연락처를 입력해주세요',
    greeting: fields.greeting,
    issues: [fields.issue1, fields.issue2, fields.issue3].filter(Boolean),
    checkPoints: fields.checkPoints,
    cta: fields.cta,
    fontClassName: getNewsletterFontClassName(fontId),
    bodyFontSize,
  }

  const handleDownload = async (format: 'png' | 'jpeg') => {
    if (!previewRef.current) return
    setDownloading(format)
    try {
      const fn = format === 'png' ? toPng : toJpeg
      const dataUrl = await fn(previewRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: format === 'jpeg' ? '#ffffff' : undefined,
      })
      const a = document.createElement('a')
      const dateStr = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')
      a.href = dataUrl
      a.download = `뉴스레터_${topic || '이미지'}_${dateStr}.${format === 'jpeg' ? 'jpg' : 'png'}`
      a.click()
      toast.success("이미지 다운로드가 시작되었습니다")
    } catch {
      toast.error("이미지 생성 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setDownloading(null)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <ImageIcon className="h-4 w-4" />
        이미지로 만들기
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h2 className="font-bold text-lg text-gray-900">뉴스레터 이미지로 만들기</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[360px_1fr]">
              {/* 왼쪽: 옵션 + 편집 */}
              <div className="border-r p-5 space-y-5 overflow-y-auto">
                <div>
                  <Label className="mb-2 block">레이아웃 선택</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {NEWSLETTER_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTemplateId(t.id)}
                        className={`text-left rounded-lg border p-2.5 text-xs transition-colors ${
                          templateId === t.id
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <p className="font-semibold">{t.label}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{t.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">폰트 선택</Label>
                  <div className="flex gap-2">
                    {NEWSLETTER_FONTS.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFontId(f.id)}
                        className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                          fontId === f.id
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        } ${f.className}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">호수</Label>
                    <Input value={fields.issueLabel} onChange={e => set('issueLabel', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">담당 FP 이름</Label>
                    <Input value={fields.agentName} onChange={e => set('agentName', e.target.value)} placeholder="예: 임현수" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">연락처</Label>
                  <Input value={fields.agentContact} onChange={e => set('agentContact', e.target.value)} placeholder="예: 010-1234-5678" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">제목</Label>
                  <Textarea value={fields.title} onChange={e => set('title', e.target.value)} rows={2} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">인사말</Label>
                  <Textarea value={fields.greeting} onChange={e => set('greeting', e.target.value)} rows={3} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">핵심 이슈 1</Label>
                  <Textarea value={fields.issue1} onChange={e => set('issue1', e.target.value)} rows={3} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">핵심 이슈 2</Label>
                  <Textarea value={fields.issue2} onChange={e => set('issue2', e.target.value)} rows={3} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">핵심 이슈 3</Label>
                  <Textarea value={fields.issue3} onChange={e => set('issue3', e.target.value)} rows={3} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">보험 점검 포인트</Label>
                  <Textarea value={fields.checkPoints} onChange={e => set('checkPoints', e.target.value)} rows={3} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">행동 유도 문구 (CTA)</Label>
                  <Textarea value={fields.cta} onChange={e => set('cta', e.target.value)} rows={2} className="text-sm" />
                </div>
              </div>

              {/* 오른쪽: 미리보기 */}
              <div className="bg-gray-100 p-6 overflow-auto flex justify-center items-start">
                <div ref={previewRef} className="shadow-xl">
                  <TemplateComponent data={templateData} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t shrink-0 bg-white">
              <p className="text-xs text-gray-400 mr-auto">미리보기 그대로 이미지로 저장됩니다</p>
              <Button
                variant="outline"
                className="gap-2"
                disabled={downloading !== null}
                onClick={() => handleDownload('jpeg')}
              >
                {downloading === 'jpeg' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                JPG 다운로드
              </Button>
              <Button
                className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                disabled={downloading !== null}
                onClick={() => handleDownload('png')}
              >
                {downloading === 'png' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                PNG 다운로드
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
