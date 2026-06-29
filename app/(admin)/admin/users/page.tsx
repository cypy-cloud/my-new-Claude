import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
          <p className="text-gray-600 mt-1">전체 사용자 목록 및 관리</p>
        </div>
        <Badge variant="outline" className="border-yellow-400 text-yellow-600">Admin</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2"><Users className="h-5 w-5" /><span>사용자 목록</span></CardTitle>
          <CardDescription>전체 가입 사용자 관리</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-3 text-gray-400">
          <Users className="h-12 w-12" />
          <p className="text-sm font-medium">사용자 관리 - Phase 5에서 구현됩니다</p>
          <p className="text-xs">사용자 목록, 구독 관리, 권한 설정 등이 추가될 예정입니다</p>
        </CardContent>
      </Card>
    </div>
  )
}
