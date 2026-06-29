"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { User, Lock, CreditCard, AlertTriangle } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-gray-600 mt-1">계정 및 구독 정보를 관리합니다</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>프로필 정보</span>
          </CardTitle>
          <CardDescription>개인 정보와 소속 정보를 수정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>이름</Label>
              <Input placeholder="홍길동" />
            </div>
            <div className="space-y-2">
              <Label>연락처</Label>
              <Input placeholder="010-0000-0000" type="tel" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>이메일</Label>
            <Input placeholder="example@email.com" type="email" disabled className="bg-gray-50" />
            <p className="text-xs text-gray-500">이메일은 변경할 수 없습니다</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>보험사/대리점명</Label>
              <Input placeholder="○○ 생명보험" />
            </div>
            <div className="space-y-2">
              <Label>지점명</Label>
              <Input placeholder="강남 지점" />
            </div>
          </div>
          <Button>변경 사항 저장</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>비밀번호 변경</span>
          </CardTitle>
          <CardDescription>보안을 위해 정기적으로 비밀번호를 변경하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>현재 비밀번호</Label>
            <Input type="password" placeholder="현재 비밀번호" />
          </div>
          <div className="space-y-2">
            <Label>새 비밀번호</Label>
            <Input type="password" placeholder="새 비밀번호 (8자 이상)" />
          </div>
          <div className="space-y-2">
            <Label>새 비밀번호 확인</Label>
            <Input type="password" placeholder="새 비밀번호 재입력" />
          </div>
          <Button variant="outline">비밀번호 변경</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>구독 정보</span>
          </CardTitle>
          <CardDescription>현재 구독 플랜과 결제 정보</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-semibold text-gray-900">무료 플랜</p>
              <p className="text-sm text-gray-500">월 0원 · AI 기능 제한 이용</p>
            </div>
            <Badge variant="secondary">현재 플랜</Badge>
          </div>
          <Button>프로 플랜으로 업그레이드</Button>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>위험 구역</span>
          </CardTitle>
          <CardDescription>되돌릴 수 없는 작업입니다. 신중하게 진행하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" disabled>계정 삭제 (준비 중)</Button>
        </CardContent>
      </Card>
    </div>
  )
}
