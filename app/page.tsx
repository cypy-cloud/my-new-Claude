import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, BookOpen, FileText, Zap, CheckCircle, ArrowRight } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl text-gray-900">FP AI Assistant</span>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" asChild><Link href="/login">로그인</Link></Button>
            <Button asChild><Link href="/signup">무료로 시작하기</Link></Button>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
          <Zap className="h-4 w-4" />
          <span>보험설계사를 위한 AI 자동화</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          보험설계사를 위한<br />
          <span className="text-blue-600">AI 업무 자동화</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          문자/카톡 작성, 상담 스크립트, PDF 설명자료를 AI가 자동으로 생성해드립니다.<br />
          매일 반복되는 업무를 AI에게 맡기고 고객 응대에 집중하세요.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild className="text-base px-8">
            <Link href="/signup">무료로 시작하기 <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-base px-8">
            <Link href="/login">로그인</Link>
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-4">신용카드 불필요 · 무료 플랜 영구 제공</p>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">3가지 핵심 기능</h2>
        <p className="text-center text-gray-600 mb-12">보험설계사의 일상 업무를 AI가 대신합니다</p>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-2 hover:border-blue-200 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">AI 문자/카톡 생성</CardTitle>
              <CardDescription className="text-base">고객 상황에 맞는 맞춤형 문자와 카카오톡 메시지를 AI가 즉시 작성해드립니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {["생일/기념일 축하 메시지", "보험 만기 안내", "신상품 소개", "감사 메시지"].map((item) => (
                  <li key={item} className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-blue-200 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl">AI 상담 스크립트</CardTitle>
              <CardDescription className="text-base">고객 유형과 상품에 맞는 상담 스크립트를 AI가 생성하여 성공적인 상담을 지원합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {["종신/저축 보험 상담", "실손/건강 보험", "자동차 보험", "연금 상품"].map((item) => (
                  <li key={item} className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-blue-200 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle className="text-xl">AI PDF 설명자료</CardTitle>
              <CardDescription className="text-base">복잡한 보험 약관 PDF를 업로드하면 AI가 고객용 쉬운 설명자료로 변환해드립니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {["핵심 보장 내용 요약", "주요 혜택 정리", "보험료 조건 안내", "고객 설명용 예시"].map((item) => (
                  <li key={item} className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-blue-600 py-16 mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">지금 바로 시작해보세요</h2>
          <p className="text-blue-100 text-lg mb-8">월 5회 무료로 AI 기능을 체험해보세요. 신용카드 없이 시작 가능합니다.</p>
          <Button size="lg" variant="secondary" asChild className="text-base px-8">
            <Link href="/signup">무료로 시작하기 <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 mt-0">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>© 2024 FP AI Assistant. 보험설계사를 위한 AI 업무 자동화 서비스.</p>
        </div>
      </footer>
    </div>
  )
}
