import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookMarked, MessageSquare, BookOpen, FileText, ArrowRight, PlayCircle } from "lucide-react"

const GUIDES = [
  {
    id: "1", icon: MessageSquare, color: "blue", badge: "초급",
    title: "AI 문자/카톡 생성기 사용법",
    desc: "고객 맞춤형 메시지를 3단계로 생성하는 방법을 알아보세요",
    steps: ["메시지 유형 선택 (생일, 만기 안내 등)", "고객 이름과 상황 입력", "스타일 선택 후 생성 클릭"],
    href: "/ai-message",
  },
  {
    id: "2", icon: BookOpen, color: "purple", badge: "초급",
    title: "AI 상담 스크립트 생성기 사용법",
    desc: "상품 유형과 고객 연령에 맞는 스크립트를 자동 생성합니다",
    steps: ["보험 상품 유형 선택", "고객 연령대 및 상담 목적 선택", "고객 우려사항 입력 (선택사항)"],
    href: "/ai-script",
  },
  {
    id: "3", icon: FileText, color: "orange", badge: "중급",
    title: "AI PDF 분석 사용법",
    desc: "보험 약관 PDF를 업로드하여 고객용 설명자료를 만드는 방법",
    steps: ["PDF 파일 드래그 또는 클릭으로 업로드", "타겟 고객 유형 선택", "출력 스타일 선택 후 생성"],
    href: "/ai-document",
  },
]

const iconBgMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
  orange: "bg-orange-100 text-orange-500",
}

const badgeMap: Record<string, string> = {
  초급: "bg-green-100 text-green-700 border-green-200",
  중급: "bg-yellow-100 text-yellow-700 border-yellow-200",
  고급: "bg-red-100 text-red-700 border-red-200",
}

export default function GuidePage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
          <BookMarked className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">사용 가이드</h1>
          <p className="text-gray-500 text-sm">FP AI Assistant를 100% 활용하는 방법을 알아보세요</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8e] rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <PlayCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg mb-1">🚀 첫 번 사용하시나요?</h2>
            <p className="text-blue-200 text-sm mb-3">아래 가이드를 순서대로 따라하면 5분 안에 첫 번째 AI 결과물을 만들 수 있습니다.</p>
            <Link href="/ai-message" className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              첫 번째 AI 문자 생성하기 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-700">기능별 가이드</h2>
        {GUIDES.map((guide) => {
          const Icon = guide.icon
          return (
            <Card key={guide.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgMap[guide.color]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base text-[#1e3a5f]">{guide.title}</CardTitle>
                      <Badge className={`text-xs ${badgeMap[guide.badge]} hover:${badgeMap[guide.badge]}`}>{guide.badge}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{guide.desc}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="ml-13 pl-1">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">사용 순서</p>
                  <ol className="space-y-1.5">
                    {guide.steps.map((step, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                        <span className="w-5 h-5 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <Link href={guide.href} className="inline-flex items-center gap-1.5 text-orange-500 hover:text-orange-600 text-sm font-medium mt-4">
                    지금 사용해보기 <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-0 shadow-sm bg-orange-50 border-l-4 border-l-orange-400">
        <CardContent className="p-5">
          <h3 className="font-semibold text-orange-700 mb-3">💡 활용 팁</h3>
          <ul className="space-y-2">
            {[
              "고객 이름을 정확히 입력할수록 더 개인화된 메시지가 생성됩니다",
              "생성된 결과물은 '내 결과물 보관함'에 자동 저장됩니다",
              "마음에 들지 않으면 '다시 생성하기'로 새로운 버전을 만들 수 있습니다",
              "복사 버튼을 누르면 클립보드에 즉시 복사됩니다",
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-orange-700">
                <span className="text-orange-500 mt-0.5">✓</span>
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
