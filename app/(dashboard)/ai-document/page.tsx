import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

export default function AiDocumentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 설명자료 생성</h1>
          <p className="text-gray-600 mt-1">PDF 약관을 업로드하면 AI가 고객용 설명자료로 변환해드립니다</p>
        </div>
        <Badge variant="secondary">Phase 2</Badge>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">준비 중입니다</h2>
            <p className="text-gray-500 mt-2">AI 설명자료 생성기 - Phase 2에서 구현됩니다</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
