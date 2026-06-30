import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookMarked, MessageSquare, BookOpen, FileText, ArrowRight, PlayCircle, ShieldAlert, Download, CreditCard, HelpCircle } from "lucide-react"
import { PLANS } from "@/lib/subscription/plans"

const FAQ = [
  {
    q: "생성된 메시지나 스크립트를 수정할 수 있나요?",
    a: "네, 생성된 결과물은 자유롭게 복사하여 메신저나 문서에서 수정하실 수 있습니다. 마음에 들지 않으면 '다시 생성하기'로 새 버전을 만들 수도 있어요.",
  },
  {
    q: "월 사용 한도를 초과하면 어떻게 되나요?",
    a: "한도를 초과하면 해당 기능은 다음 달까지 사용이 제한됩니다. 대시보드에서 사용량을 미리 확인하고, 한도가 부족하면 요금제를 업그레이드할 수 있습니다.",
  },
  {
    q: "업로드한 PDF나 생성된 결과물은 얼마나 보관되나요?",
    a: "요금제별 보관 기간(무료 7일 ~ 프리미엄 365일) 동안 보관되며, 이후 자동으로 삭제됩니다. 중요한 결과물은 보관 기간 내에 다운로드해두세요.",
  },
  {
    q: "고객의 개인정보를 입력해도 안전한가요?",
    a: "주민등록번호, 계좌번호, 카드번호 등 민감한 정보는 절대 입력하지 마세요. 이름, 연령대, 상품 종류 등 최소한의 정보만 사용하는 것을 권장합니다.",
  },
]

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

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
            <FileText className="h-4 w-4 text-orange-500" /> PDF 업로드 주의사항
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="space-y-2">
            {[
              "요금제별 최대 파일 크기를 초과하면 업로드가 거부됩니다 (대시보드에서 확인 가능)",
              "텍스트가 포함된 PDF만 분석이 가능하며, 스캔 이미지로만 된 PDF는 인식률이 떨어질 수 있습니다",
              "고객 개인정보가 포함된 원본 PDF는 업로드 전 가급적 마스킹 처리해주세요",
              "업로드한 파일은 요금제별 보관 기간이 지나면 자동으로 삭제됩니다",
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-orange-500 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm border-l-4 border-l-red-400 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-red-700 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> 개인정보 주의사항
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="space-y-2">
            {[
              "주민등록번호, 계좌번호, 카드번호 등 민감한 개인정보는 절대 입력하지 마세요",
              "고객 메시지/스크립트 생성 시 이름, 연령대 등 최소한의 정보만 사용하세요",
              "PDF 분석 시 약관 자체에는 문제 없지만, 고객의 가입 내역이 담긴 문서는 업로드 전 검토해주세요",
              "생성된 결과물을 외부로 공유할 때도 개인정보가 포함되지 않았는지 다시 확인해주세요",
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-red-700">
                <span className="text-red-500 mt-0.5">⚠</span>
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
            <Download className="h-4 w-4 text-blue-500" /> 결과물 다운로드 방법
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ol className="space-y-1.5">
            {[
              "각 기능 결과 화면에서 '복사' 버튼을 누르면 클립보드에 즉시 복사됩니다",
              "PDF 분석 결과는 '다운로드' 버튼으로 파일로 저장할 수 있습니다",
              "생성된 결과물은 '내 결과물 보관함'에서 언제든 다시 확인하고 다운로드할 수 있습니다",
              "보관 기간이 지나기 전에 중요한 결과물은 미리 다운로드해두세요",
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-purple-500" /> 요금제 안내
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.values(PLANS).map((plan) => (
              <div key={plan.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-[#1e3a5f] text-sm">{plan.name}</p>
                  <p className="text-sm font-bold text-orange-500">
                    {plan.price === 0 ? "무료" : `₩${plan.price.toLocaleString()}/월`}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  문자 {plan.smsLimit}회 · 스크립트 {plan.scriptLimit}회 · PDF 분석 {plan.pdfAnalysisLimit}회 · 보관 {plan.storageDays}일
                </p>
              </div>
            ))}
          </div>
          <Link href="/billing" className="inline-flex items-center gap-1.5 text-orange-500 hover:text-orange-600 text-sm font-medium mt-4">
            요금제 자세히 보기 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-gray-500" /> 자주 묻는 질문
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y divide-gray-100">
            {FAQ.map((item) => (
              <div key={item.q} className="py-3">
                <p className="text-sm font-semibold text-[#1e3a5f] mb-1">Q. {item.q}</p>
                <p className="text-sm text-gray-600">A. {item.a}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
