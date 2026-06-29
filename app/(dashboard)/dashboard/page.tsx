import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, BookOpen, FileText, TrendingUp, ArrowRight } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">안녕하세요!</h1>
        <p className="text-gray-600 mt-1">오늘도 FP AI Assistant와 함께 효율적인 업무를 시작해보세요.</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">이번 달 사용량</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span>AI 문자/카톡</span>
              </CardDescription>
              <CardTitle className="text-3xl font-bold">0 <span className="text-base font-normal text-gray-500">/ 5</span></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: "0%" }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">무료 플랜 · 월 5회</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-purple-500" />
                <span>AI 상담 스크립트</span>
              </CardDescription>
              <CardTitle className="text-3xl font-bold">0 <span className="text-base font-normal text-gray-500">/ 3</span></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: "0%" }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">무료 플랜 · 월 3회</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-orange-500" />
                <span>AI 설명자료</span>
              </CardDescription>
              <CardTitle className="text-3xl font-bold">0 <span className="text-base font-normal text-gray-500">/ 1</span></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-600 h-2 rounded-full" style={{ width: "0%" }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">무료 플랜 · 월 1회</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>현재 플랜</span>
              </CardTitle>
              <CardDescription className="mt-1">더 많은 기능을 이용하려면 업그레이드하세요</CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">무료</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="mr-2">플랜 업그레이드</Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 시작</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/ai-message">
            <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">AI 문자/카톡 생성</p>
                  <p className="text-sm text-gray-500 mt-0.5">고객 메시지 자동 작성</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/ai-script">
            <Card className="hover:border-purple-300 hover:shadow-md transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">AI 상담 스크립트</p>
                  <p className="text-sm text-gray-500 mt-0.5">맞춤형 상담 스크립트</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/ai-document">
            <Card className="hover:border-orange-300 hover:shadow-md transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">AI 설명자료</p>
                  <p className="text-sm text-gray-500 mt-0.5">PDF 설명자료 자동화</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
          <CardDescription>최근 AI 사용 내역</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <TrendingUp className="h-12 w-12 mb-3" />
            <p className="text-sm">아직 사용 내역이 없습니다</p>
            <p className="text-xs mt-1">AI 기능을 사용하면 여기에 내역이 표시됩니다</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
