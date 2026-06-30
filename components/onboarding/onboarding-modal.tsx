'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, BookOpen, FileText, ShieldAlert, Rocket, ArrowRight, ArrowLeft, X } from 'lucide-react'

interface Slide {
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    icon: Rocket,
    iconBg: 'bg-orange-500',
    title: 'FP AI Assistant에 오신 것을 환영합니다!',
    body: '보험설계사 업무에 필요한 AI 도구 3가지를 1분 안에 소개해드릴게요.',
  },
  {
    icon: MessageSquare,
    iconBg: 'bg-blue-500',
    title: 'AI 문자/카톡 생성기',
    body: '생일 축하, 만기 안내 등 고객에게 보낼 메시지를 상황에 맞게 자동으로 작성해줍니다.',
  },
  {
    icon: BookOpen,
    iconBg: 'bg-purple-500',
    title: 'AI 상담 스크립트 생성기',
    body: '상품 유형과 고객 연령대에 맞춘 상담 스크립트를 몇 초 만에 만들어드립니다.',
  },
  {
    icon: FileText,
    iconBg: 'bg-orange-500',
    title: 'AI PDF 분석',
    body: '복잡한 보험 약관 PDF를 업로드하면 고객용 설명자료로 쉽게 풀어드립니다.',
  },
  {
    icon: ShieldAlert,
    iconBg: 'bg-red-500',
    title: '개인정보 보호 안내',
    body: '고객의 주민번호, 계좌번호 등 민감한 개인정보는 입력하지 마세요. 이름, 연령대 등 최소한의 정보만 사용해주세요.',
  },
]

export function OnboardingModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    fetch('/api/onboarding')
      .then((r) => r.json())
      .then((d) => {
        if (d.onboarding && d.onboarding.completed_intro === false) {
          setOpen(true)
        }
      })
      .catch(() => {})
  }, [])

  async function complete(goToFeature: boolean) {
    setOpen(false)
    await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_intro: true }),
    }).catch(() => {})
    if (goToFeature) router.push('/ai-message')
  }

  if (!open) return null

  const slide = SLIDES[step]
  const Icon = slide.icon
  const isLast = step === SLIDES.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl relative">
        <button
          onClick={() => complete(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 pt-8">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${slide.iconBg}`}>
            <Icon className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-[#1e3a5f] mb-2">{slide.title}</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{slide.body}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-4">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-orange-500' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 pb-6">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
            >
              <ArrowLeft className="h-4 w-4" /> 이전
            </button>
          ) : (
            <button onClick={() => complete(false)} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2">
              나중에 보기
            </button>
          )}

          {isLast ? (
            <button
              onClick={() => complete(true)}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              첫 결과물 만들어보기 <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 bg-[#1e3a5f] hover:bg-[#15293f] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              다음 <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
