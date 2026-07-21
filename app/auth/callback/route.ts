import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // 카카오 등 소셜 로그인은 이메일 가입 폼의 약관 동의 체크박스를 거치지 않고
      // handle_new_user() 트리거로 프로필이 곧바로 생성되므로, terms_agreed_at이 비어
      // 있으면(=최초 소셜 로그인) 연락처·약관 동의를 받는 화면으로 먼저 보낸다.
      const userId = data.user?.id
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('terms_agreed_at')
          .eq('id', userId)
          .single()

        if (profile && !profile.terms_agreed_at) {
          const completeUrl = new URL('/auth/complete-profile', origin)
          completeUrl.searchParams.set('next', next)
          return NextResponse.redirect(completeUrl)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
