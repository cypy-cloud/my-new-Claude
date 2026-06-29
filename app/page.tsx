import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare, BookOpen, FileText, Zap, CheckCircle, ArrowRight,
  Shield, Clock, TrendingUp, Star, ChevronRight
} from "lucide-react"

const FEATURES = [
  {
    icon: MessageSquare, color: "blue", iconBg: "bg-blue-100", iconColor: "text-blue-600",
    title: "AI 문자/카톡 생성",
    desc: "고객 상황에 맞는 맞춤형 문자와 카카오톡 메시지를 AI가 즉시 작성해드립니다.",
    items: ["생일/기념일 축하 메시지", "보험 만기 안내", "신상품 소개", "감사 메시지"],
  },
  {
    icon: BookOpen, color: "purple", iconBg: "bg-purple-100", iconColor: "text-purple-600",
    title: "AI 상담 스크립트",
    desc: "고객 유형과 상품에 맞는 상담 스크립트를 AI가 생성하여 성공적인 상담을 지원합니다.",
    items: ["종신/저축 보험 상담", "실손/건강 보험", "자동차 보험", "연금 상품"],
  },
  {
    icon: FileText, color: "orange", iconBg: "bg-orange-100", iconColor: "text-orange-500",
    title: "AI PDF 설명자료",
    desc: "복잡한 보험 약관 PDF를 업로드하면 AI가 고객용 쉽은 설명자료로 변환해드립니다.",
    items: ["핵심 보장 내용 요약", "주요 혜택 정리", "보험료 조건 안내", "고객 설명용 예시"],
  },
]

const PLANS = [
  { id: "free", name: "무료", price: "₩0", period: "/월", color: "border-gray-200", badge: "", features: ["AI 문자 5회", "AI 스크립트 3회", "AI 설명자료 1회", "이메일 지원"] },
  { id: "pro", name: "프로", price: "₩29,000", period: "/월", color: "border-[#1e3a5f]", badge: "인기", features: ["AI 문자 200회", "AI 스크립트 100회", "AI 설명자료 30회", "우선 고객 지원", "결과물 무제한 보관"] },
  { id: "team", name: "팀", price: "₩79,000", period: "/월", color: "border-orange-400", badge: "팀용", features: ["AI 문자 1,000회", "AI 스크립트 500회", "AI 설명자료 150회", "팀원 5명 추가", "전담 고객 지원"] },
]

const STATS = [
  { label: "가입 설계사", value: "1,200+", icon: Shield },
  { label: "생성된 메시지", value: "48,000+", icon: MessageSquare },
  { label: "평균 업무 절감", value: "2시간/일", icon: Clock },
  { label: "사용자 만족도", value: "4.9/5", icon: Star },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg text-[#1e3a5f]">FP AI Assistant</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link href="#features" className="hover:text-[#1e3a5f] transition-colors">기능</Link>
            <Link href="#pricing" className="hover:text-[#1e3a5f] transition-colors">요금제</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="text-[#1e3a5f]"><Link href="/login">로그인</Link></Button>
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white"><Link href="/signup">무료 시작</Link></Button>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] text-white py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <Badge className="mb-6 bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/20">
            🚀 보험설계사 전용 AI 업무 자동화
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            반복 업무는 AI에게,<br />
            <span className="text-orange-400">고객 관계</span>에 집중하세요
          </h1>
          <p className="text-lg sm:text-xl text-blue-200 mb-10 max-w-2xl mx-auto leading-relaxed">
            문자/카톡 작성, 상담 스크립트, PDF 설명자료를<br className="hidden sm:block" />
            AI가 즉시 생성합니다. 하루 2시간 업무를 절약하세요.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto text-base h-12 px-8">
              <Link href="/signup">무료로 시작하기 <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto text-base h-12 px-8 bg-transparent">
              <Link href="/login">로그인</Link>
            </Button>
          </div>
          <p className="text-sm text-blue-300 mt-5">신용카드 불필요 · 무료 플랜 영구 제공 · 1분 내 시작</p>
        </div>
      </section>

      <section className="border-b bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="text-center">
                  <div className="flex justify-center mb-2"><Icon className="h-5 w-5 text-orange-500" /></div>
                  <div className="text-2xl font-bold text-[#1e3a5f]">{s.value}</div>
                  <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1e3a5f] mb-4">보험설계사의 일상 업무를 AI가 대신합니다</h2>
            <p className="text-gray-500 text-lg">복잡한 설정 없이 바로 사용하세요</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6">
                  <div className={`w-12 h-12 ${f.iconBg} rounded-xl flex items-center justify-center mb-5`}>
                    <Icon className={`h-6 w-6 ${f.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">{f.title}</h3>
                  <p className="text-gray-600 text-sm mb-5 leading-relaxed">{f.desc}</p>
                  <ul className="space-y-2.5">
                    {f.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /><span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[#1e3a5f] mb-3">3단계로 완성</h2>
            <p className="text-gray-500">복잡한 설정 없이 누구나 바로 사용할 수 있습니다</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "상황 입력", desc: "고객 이름, 상황, 원하는 메시지 스타일을 간단히 입력합니다", icon: "✏️" },
              { step: "02", title: "AI 생성", desc: "AI가 3초 안에 보험설계사에 최적화된 메시지를 완성합니다", icon: "⚡" },
              { step: "03", title: "복사 & 발송", desc: "한 클릭으로 복사하여 카카오톡이나 문자로 바로 발송하세요", icon: "📤" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-16 h-16 bg-[#1e3a5f] rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl">{s.icon}</div>
                <div className="text-orange-500 font-bold text-sm mb-2">STEP {s.step}</div>
                <h3 className="text-lg font-bold text-[#1e3a5f] mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[#1e3a5f] mb-3">합리적인 요금제</h2>
            <p className="text-gray-500">무료로 시작하고, 필요할 때 업그레이드하세요</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`bg-white rounded-2xl border-2 ${plan.color} p-6 relative ${plan.id === "pro" ? "shadow-lg scale-105" : ""}`}>
                {plan.badge && (
                  <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 ${plan.id === "pro" ? "bg-[#1e3a5f] text-white" : "bg-orange-500 text-white"}`}>{plan.badge}</Badge>
                )}
                <h3 className="text-xl font-bold text-[#1e3a5f] mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-5">
                  <span className="text-3xl font-bold text-[#1e3a5f]">{plan.price}</span>
                  <span className="text-gray-500 text-sm mb-1">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /><span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className={`w-full ${plan.id === "pro" ? "bg-[#1e3a5f] hover:bg-[#162d4a] text-white" : plan.id === "team" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`} variant={plan.id === "free" ? "outline" : "default"}>
                  <Link href="/signup">{plan.id === "free" ? "무료로 시작" : "시작하기"}<ChevronRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#1e3a5f]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 text-orange-400 fill-orange-400" />)}
          </div>
          <blockquote className="text-xl md:text-2xl text-white font-medium mb-6 leading-relaxed">
            "하루에 문자 20개씩 쓰던 게 이제 5분 안에 끍납니다.<br className="hidden sm:block" />
            고객 응대에 더 집중할 수 있게 됐어요."
          </blockquote>
          <cite className="text-blue-300 text-sm not-italic">— 김○○ 설계사, 삼성생명 10년 경력</cite>
        </div>
      </section>

      <section className="py-20 bg-orange-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <TrendingUp className="h-12 w-12 text-orange-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-[#1e3a5f] mb-4">지금 바로 시작해보세요</h2>
          <p className="text-gray-600 mb-8">신용카드 없이 무료로 시작 · 언제든지 해지 가능</p>
          <Button size="lg" asChild className="bg-orange-500 hover:bg-orange-600 text-white h-12 px-10 text-base">
            <Link href="/signup">무료로 시작하기 <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold text-[#1e3a5f]">FP AI Assistant</span>
            </div>
            <p className="text-sm text-gray-500">© 2025 FP AI Assistant. 보험설계사를 위한 AI 업무 자동화.</p>
            <div className="flex gap-5 text-sm text-gray-500">
              <Link href="#" className="hover:text-[#1e3a5f]">이용약관</Link>
              <Link href="#" className="hover:text-[#1e3a5f]">개인정보처리방침</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
