"use client"

import { useEffect, useRef, useState } from "react"
import { toPng, toJpeg } from "html-to-image"
import { toast } from "sonner"
import { ImageIcon, Download, X, Loader2, ShieldCheck, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
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

// app/api/ai/newsletter/route.ts에서 CTA 뒤에 항상 붙이는 컴플라이언스 안내문(NEWSLETTER_DISCLAIMER)은
// 설계사 본인이 발송 전 확인하라는 내부용 문구라, 고객에게 바로 전달되는 이미지에는 넣지 않는다.
function stripDisclaimer(cta: string) {
  const idx = cta.indexOf('⚠️ 법적 유의사항')
  return idx === -1 ? cta.trim() : cta.slice(0, idx).trim()
}

// AI가 가끔 제목 끝에 마크다운 구분선(---, ===)을 덧붙이는 경우가 있어 제거한다.
function stripTrailingRule(text: string) {
  return text.replace(/\s*[-=]{2,}\s*$/, '').trim()
}

export function NewsletterImagePanel({ sections, topic }: NewsletterImagePanelProps) {
  const [open, setOpen] = useState(false)
  const [templateId, setTemplateId] = useState<NewsletterTemplateId>('minimal')
  const [fontId, setFontId] = useState<NewsletterFontId>('sans')
  const [downloading, setDownloading] = useState<'png' | 'jpeg' | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // 이미지에 찍히는 발행인 이름·연락처는 계정에 등록된 실명·연락처로 고정한다.
  // 매번 자유 입력을 허용하면 계정 하나로 여러 사람이 각자 다른 이름으로
  // 뉴스레터를 찍어낼 수 있어 이를 막기 위한 조치다 (프로필에서만 수정 가능).
  const [profile, setProfile] = useState<{ name: string; phone: string; email: string } | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const profileComplete = !!(profile?.name && profile?.phone)

  useEffect(() => {
    if (!open || profile) return
    setProfileLoading(true)
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setProfileLoading(false); return }
      const { data } = await (supabase as any)
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single()
      setProfile({
        name: data?.full_name ?? '',
        phone: data?.phone ?? '',
        email: user.email ?? '',
      })
      setProfileLoading(false)
    })()
  }, [open, profile])

  const [fields, setFields] = useState({
    issueLabel: defaultIssueLabel(),
    title: '',
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
      title: stripTrailingRule(sections.TITLE ?? topic),
      greeting: stripTrailingRule(sections.GREETING ?? ''),
      issue1: stripTrailingRule(sections.ISSUE_1 ?? ''),
      issue2: stripTrailingRule(sections.ISSUE_2 ?? ''),
      issue3: stripTrailingRule(sections.ISSUE_3 ?? ''),
      checkPoints: stripTrailingRule(sections.CHECK_POINTS ?? ''),
      cta: stripTrailingRule(stripDisclaimer(sections.CTA ?? '')),
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
    agentName: profile?.name || '담당 FP',
    agentContact: profile?.phone || '연락처를 등록해주세요',
    greeting: fields.greeting,
    issues: [fields.issue1, fields.issue2, fields.issue3].filter(Boolean),
    checkPoints: fields.checkPoints,
    cta: fields.cta,
    fontClassName: getNewsletterFontClassName(fontId),
    bodyFontSize,
  }

  const handleDownload = async (format: 'png' | 'jpeg') => {
    if (!previewRef.current) return
    if (!profileComplete) {
      toast.error("이미지를 만들려면 먼저 설정에서 실명과 연락처를 등록해주세요")
      return
    }
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
                {!profileLoading && !profileComplete && (
                  <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                    <p>
                      이미지에 표시할 발행인 이름·연락처가 프로필에 등록되어 있지 않아요.
                      <Link href="/settings" className="underline font-semibold ml-1">설정에서 등록하기</Link>
                    </p>
                  </div>
                )}

                <div>
                  <Label className="mb-2 block">발행인 정보 (계정에 등록된 정보로 자동 표시)</Label>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                    <ShieldCheck className="h-4 w-4 text-gray-400 shrink-0" />
                    {profileLoading ? (
                      <span className="text-gray-400">불러오는 중...</span>
                    ) : (
                      <span className="text-gray-700">
                        {profile?.name || '이름 미등록'} · {profile?.phone || '연락처 미등록'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">계정 공유 방지를 위해 발행인 정보는 여기서 수정할 수 없어요.</p>
                </div>

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

                <div className="space-y-1.5">
                  <Label className="text-xs">호수</Label>
                  <Input value={fields.issueLabel} onChange={e => set('issueLabel', e.target.value)} className="h-9 text-sm" />
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
                disabled={downloading !== null || !profileComplete}
                onClick={() => handleDownload('jpeg')}
              >
                {downloading === 'jpeg' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                JPG 다운로드
              </Button>
              <Button
                className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                disabled={downloading !== null || !profileComplete}
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
