"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { User, Lock, CreditCard, AlertTriangle, Bell, ImageIcon, Trash2 } from "lucide-react"
import { PushNotificationToggle } from "@/components/notifications/push-notification-toggle"
import { toast } from "sonner"
import Link from "next/link"
import { PLAN_LABELS, type PlanId } from "@/lib/subscription/plans"

export default function SettingsPage() {
  const supabase = createClient()

  // 프로필 상태
  const [profile, setProfile] = useState({ name: "", phone: "", company: "", branch: "", email: "" })
  const [profileLoading, setProfileLoading] = useState(false)

  // 뉴스레터 발행인 이미지(로고/프로필 사진)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // 비밀번호 상태
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" })
  const [pwLoading, setPwLoading] = useState(false)

  // 현재 플랜
  const [planId, setPlanId] = useState<PlanId>("free")

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setProfile(prev => ({ ...prev, email: user.email ?? "" }))

      const { data } = await (supabase as any)
        .from("profiles")
        .select("full_name, phone, company, branch, plan_type, avatar_url")
        .eq("id", user.id)
        .single()

      if (data) {
        setProfile(prev => ({
          ...prev,
          name: data.full_name ?? "",
          phone: data.phone ?? "",
          company: data.company ?? "",
          branch: data.branch ?? "",
        }))
        setPlanId((data.plan_type as PlanId) ?? "free")
        setAvatarUrl(data.avatar_url ?? null)
      }
    }
    load()
  }, [])

  const MAX_AVATAR_MB = 2
  const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"]

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error("PNG, JPG, WebP 이미지만 업로드할 수 있어요")
      return
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      toast.error(`이미지 용량은 ${MAX_AVATAR_MB}MB 이하로 올려주세요`)
      return
    }

    setAvatarUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("로그인이 필요합니다")

      const ext = file.name.split(".").pop() ?? "png"
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("newsletter-avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from("newsletter-avatars")
        .getPublicUrl(path)
      // 캐시된 옛 이미지가 계속 보이는 것을 방지하기 위해 매번 다른 URL을 저장한다
      const freshUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

      const { error: dbError } = await (supabase as any)
        .from("profiles")
        .update({ avatar_url: freshUrl })
        .eq("id", user.id)
      if (dbError) throw dbError

      setAvatarUrl(freshUrl)
      toast.success("이미지가 업로드되었습니다")
    } catch (e: any) {
      toast.error(e.message ?? "이미지 업로드에 실패했습니다")
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleAvatarRemove() {
    setAvatarUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("로그인이 필요합니다")

      const { error } = await (supabase as any)
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id)
      if (error) throw error

      setAvatarUrl(null)
      toast.success("이미지가 삭제되었습니다")
    } catch (e: any) {
      toast.error(e.message ?? "삭제에 실패했습니다")
    } finally {
      setAvatarUploading(false)
    }
  }

  async function saveProfile() {
    setProfileLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("로그인이 필요합니다")

      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          full_name: profile.name,
          phone: profile.phone,
          company: profile.company,
          branch: profile.branch,
        })
        .eq("id", user.id)

      if (error) throw error
      toast.success("프로필이 저장되었습니다")
    } catch (e: any) {
      toast.error(e.message ?? "저장에 실패했습니다")
    } finally {
      setProfileLoading(false)
    }
  }

  async function changePassword() {
    if (!pw.next || !pw.confirm) {
      toast.error("새 비밀번호를 입력해주세요")
      return
    }
    if (pw.next.length < 8) {
      toast.error("비밀번호는 8자 이상이어야 합니다")
      return
    }
    if (pw.next !== pw.confirm) {
      toast.error("새 비밀번호가 일치하지 않습니다")
      return
    }

    setPwLoading(true)
    try {
      // 현재 비밀번호로 재인증
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error("로그인이 필요합니다")

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pw.current,
      })
      if (signInError) {
        toast.error("현재 비밀번호가 올바르지 않습니다")
        return
      }

      const { error } = await supabase.auth.updateUser({ password: pw.next })
      if (error) throw error

      toast.success("비밀번호가 변경되었습니다")
      setPw({ current: "", next: "", confirm: "" })
    } catch (e: any) {
      toast.error(e.message ?? "비밀번호 변경에 실패했습니다")
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-gray-600 mt-1">계정 및 구독 정보를 관리합니다</p>
      </div>

      {/* 프로필 */}
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
              <Input
                placeholder="홍길동"
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>연락처</Label>
              <Input
                placeholder="010-0000-0000"
                type="tel"
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              뉴스레터 발행인 이미지 (로고 또는 프로필 사진)
            </Label>
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="발행인 이미지"
                  className="h-14 w-14 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild disabled={avatarUploading}>
                  <label className="cursor-pointer">
                    {avatarUploading ? "업로드 중..." : avatarUrl ? "이미지 변경" : "이미지 업로드"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={avatarUploading}
                    />
                  </label>
                </Button>
                {avatarUrl && (
                  <Button variant="outline" size="sm" onClick={handleAvatarRemove} disabled={avatarUploading}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">여기서 등록한 이미지는 뉴스레터 이미지 하단 발행인 정보 옆에 자동으로 표시됩니다. (PNG/JPG/WebP, {MAX_AVATAR_MB}MB 이하)</p>
          </div>

          <div className="space-y-2">
            <Label>이메일</Label>
            <Input value={profile.email} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-500">이메일은 변경할 수 없습니다</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>보험사/대리점명</Label>
              <Input
                placeholder="○○ 생명보험"
                value={profile.company}
                onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>지점명</Label>
              <Input
                placeholder="강남 지점"
                value={profile.branch}
                onChange={e => setProfile(p => ({ ...p, branch: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={saveProfile} disabled={profileLoading}>
            {profileLoading ? "저장 중..." : "변경 사항 저장"}
          </Button>
        </CardContent>
      </Card>

      {/* 비밀번호 변경 */}
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
            <Input
              type="password"
              placeholder="현재 비밀번호"
              value={pw.current}
              onChange={e => setPw(p => ({ ...p, current: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>새 비밀번호</Label>
            <Input
              type="password"
              placeholder="새 비밀번호 (8자 이상)"
              value={pw.next}
              onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>새 비밀번호 확인</Label>
            <Input
              type="password"
              placeholder="새 비밀번호 재입력"
              value={pw.confirm}
              onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && changePassword()}
            />
          </div>
          <Button variant="outline" onClick={changePassword} disabled={pwLoading}>
            {pwLoading ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </CardContent>
      </Card>

      {/* 구독 정보 */}
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
              <p className="font-semibold text-gray-900">{PLAN_LABELS[planId]} 플랜</p>
              <p className="text-sm text-gray-500">
                {planId === "free" ? "무료 · AI 기능 제한 이용" : "유료 구독 중"}
              </p>
            </div>
            <Badge variant="secondary">현재 플랜</Badge>
          </div>
          {planId === "free" && (
            <Button asChild>
              <Link href="/billing">플랜 업그레이드</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 알림 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>일정 알림</span>
          </CardTitle>
          <CardDescription>업무 캘린더 일정 시작 전 푸시 알림을 받습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <PushNotificationToggle />
          <p className="text-xs text-gray-400 mt-3">
            💡 일정 등록 시 &apos;알림 시간&apos; 항목에서 30분 전 · 1시간 전 · 2시간 전 등 원하는 시점을 선택하세요.
            앱이 꺼져 있어도 알림이 옵니다. (iOS는 홈화면 추가 필요)
          </p>
        </CardContent>
      </Card>

      {/* 위험 구역 */}
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
