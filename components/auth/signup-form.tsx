"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { clientTrackEvent } from "@/lib/analytics/client-track"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle, Mail, Lock, User, Phone, Building2, Shield, ChevronDown } from "lucide-react"

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showExtra, setShowExtra] = useState(false)

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [insuranceCompany, setInsuranceCompany] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) { toast.error("비밀번호가 일치하지 않습니다."); return }
    if (password.length < 8) { toast.error("비밀번호는 8자 이상이어야 합니다."); return }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || null,
            company_name: companyName || null,
            insurance_company: insuranceCompany || null,
          },
        },
      })
      if (error) {
        toast.error(error.message.includes("already registered")
          ? "이미 등록된 이메일 주소입니다."
          : error.message)
        return
      }
      clientTrackEvent('signup', { metadata: { email } })
      setIsSuccess(true)
    } catch {
      toast.error("회원가입 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-3">이메일을 확인해주세요</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            <strong className="text-gray-700">{email}</strong>로 인증 이메일을 발송했습니다.<br />
            이메일을 확인하고 링크를 클릭하여 가입을 완료해주세요.
          </p>
          <Link href="/login" className="text-orange-500 hover:text-orange-600 text-sm font-medium">
            로그인 페이지로 이동 →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1e3a5f]">무료로 시작하기</h1>
          <p className="text-gray-500 mt-2 text-sm">신용카드 없이 지금 바로 시작하세요</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">이름 <span className="text-red-500">*</span></Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="fullName" type="text" placeholder="홍길동" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={isLoading} className="pl-10 h-12" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">이메일 <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="email" type="email" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} className="pl-10 h-12" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">비밀번호 <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="password" type="password" placeholder="8자 이상 입력하세요" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} disabled={isLoading} className="pl-10 h-12" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">비밀번호 확인 <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="confirmPassword" type="password" placeholder="비밀번호를 다시 입력하세요" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} className="pl-10 h-12" />
            </div>
          </div>

          {/* Optional profile fields */}
          <button
            type="button"
            onClick={() => setShowExtra(!showExtra)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors w-full"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showExtra ? 'rotate-180' : ''}`} />
            추가 정보 입력 (선택)
          </button>

          {showExtra && (
            <div className="space-y-4 pt-1 border-t border-gray-100">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">연락처</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="phone" type="tel" placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isLoading} className="pl-10 h-12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">소속 (법인/GA명)</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="companyName" type="text" placeholder="예: OO생명 OO지점" value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={isLoading} className="pl-10 h-12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceCompany" className="text-sm font-medium text-gray-700">주력 보험사</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="insuranceCompany" type="text" placeholder="예: 삼성생명, 교보생명" value={insuranceCompany} onChange={(e) => setInsuranceCompany(e.target.value)} disabled={isLoading} className="pl-10 h-12" />
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600 text-white mt-2" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            무료로 시작하기
          </Button>
        </form>
        <p className="text-sm text-center text-gray-500 mt-5">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-orange-500 hover:text-orange-600 font-semibold">로그인</Link>
        </p>
        <p className="text-xs text-center text-gray-400 mt-4">
          가입하면 <Link href="#" className="underline">이용약관</Link> 및 <Link href="#" className="underline">개인정보처리방침</Link>에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  )
}
