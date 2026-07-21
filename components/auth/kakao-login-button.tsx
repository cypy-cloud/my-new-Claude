"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export function KakaoLoginButton({ label }: { label: string }) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleClick() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // Supabase의 기본 요청 스코프가 카카오 콘솔에 설정한 동의항목(이메일만 필수)과
          // 어긋나면 KOE205(설정하지 않은 동의항목 요청) 에러가 난다 — 정확히 이메일만
          // 요청하도록 명시해서 콘솔 설정과 항상 일치시킨다.
          scopes: "account_email",
        },
      })
      if (error) {
        toast.error(error.message)
        setIsLoading(false)
      }
      // 성공 시 카카오 인증 페이지로 리다이렉트되므로 여기서 별도 처리 없음
    } catch {
      toast.error("카카오 로그인 중 오류가 발생했습니다.")
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="w-full h-12 rounded-xl bg-[#FEE500] hover:bg-[#FDD835] text-black/85 text-base font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.83 5.18 4.59 6.57-.2.75-.73 2.71-.84 3.13-.13.52.19.51.4.37.16-.11 2.6-1.77 3.66-2.49.71.1 1.44.16 2.19.16 5.52 0 10-3.48 10-7.74C22 6.48 17.52 3 12 3z" />
      </svg>
      {label}
    </button>
  )
}
