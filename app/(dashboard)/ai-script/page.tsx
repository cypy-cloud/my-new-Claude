import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

export default function AiScriptPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 상담 스크립트</h1>
          <p className="text-gray-600 mt-1">고객 유형에 맞는 상담 스크립트를 AI가 생성해드립니다</p>
        </div>
        <Badge variant="secondary">Phase 2</Badge>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">준비 중입니다</h2>
            <p className="text-gray-500 mt-2">AI 상담 스크립트 생성기 - Phase 2에서 구현됩니다</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
