"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Phone } from "lucide-react"
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legal/versions"

export function CompleteProfileForm({ nextPath }: { nextPath: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [phone, setPhone] = useState("")
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [marketingAgreed, setMarketingAgreed] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) { toast.error("연락처를 입력해주세요."); return }
    if (!termsAgreed || !privacyAgreed) { toast.error("이용약관과 개인정보처리방침에 동의해야 서비스를 이용할 수 있습니다."); return }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error("로그인이 필요합니다."); router.push("/login"); return }

      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          phone,
          terms_agreed_at: new Date().toISOString(),
          terms_version: TERMS_VERSION,
          privacy_agreed_at: new Date().toISOString(),
          privacy_version: PRIVACY_VERSION,
          marketing_agreed_at: marketingAgreed ? new Date().toISOString() : null,
        })
        .eq("id", user.id)

      if (error) throw error

      toast.success("가입이 완료되었습니다!")
      router.push(nextPath)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? "저장 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1e3a5f]">가입 정보 확인</h1>
          <p className="text-gray-500 mt-2 text-sm">서비스 이용을 위해 마지막으로 확인해주세요</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">연락처 <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="phone" type="tel" placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={isLoading} className="pl-10 h-12" />
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-gray-100 mt-1">
            <label className="flex items-start gap-2 text-sm text-gray-700 pt-3">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                disabled={isLoading}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span>
                <span className="text-red-500">[필수]</span>{" "}
                <Link href="/terms" target="_blank" className="underline text-gray-700 hover:text-orange-600">이용약관</Link>에 동의합니다
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={(e) => setPrivacyAgreed(e.target.checked)}
                disabled={isLoading}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span>
                <span className="text-red-500">[필수]</span>{" "}
                <Link href="/privacy" target="_blank" className="underline text-gray-700 hover:text-orange-600">개인정보처리방침</Link>에 동의합니다
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={marketingAgreed}
                onChange={(e) => setMarketingAgreed(e.target.checked)}
                disabled={isLoading}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span>[선택] 이벤트·마케팅 정보 수신에 동의합니다</span>
            </label>
          </div>

          <Button type="submit" className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600 text-white mt-2" disabled={isLoading || !termsAgreed || !privacyAgreed}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            시작하기
          </Button>
        </form>
      </div>
    </div>
  )
}
