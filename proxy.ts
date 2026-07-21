import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback', '/terms', '/privacy', '/manifest.webmanifest', '/manifest.json', '/sw.js', '/offline']
const ADMIN_PATHS = ['/admin']

export async function proxy(request: NextRequest) {
  // Vercel Cron이 호출하는 API는 세션 쿠키가 없고(브라우저가 아니므로) 각 라우트 자체가
  // Authorization: Bearer <CRON_SECRET>로 자체 인증한다. 이 미들웨어의 세션 기반 로그인
  // 체크를 거치면 user가 항상 null이라 /login으로 307 리다이렉트되어 크론 핸들러 코드가
  // 아예 실행되지 않는다 — 발견된 push-notify 알림 미발송 문제의 진짜 근본 원인.
  if (request.nextUrl.pathname.startsWith('/api/cron/')) {
    return NextResponse.next({ request })
  }

  // 포트원(PortOne) 웹훅도 서버-to-서버 호출이라 브라우저 세션 쿠키가 없다 — 위 크론과
  // 동일한 이유로 세션 체크를 건너뛰고 라우트 자체의 서명 검증에 맡긴다. 이 예외가 없으면
  // 웹훅 요청이 매번 /login으로 리다이렉트되어 핸들러가 실행되지 않는다
  // (2026-07-21 코드 재검토로 발견 — push-notify 크론과 동일한 버그 패턴).
  if (request.nextUrl.pathname.startsWith('/api/billing/webhook')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith('/auth/'))) {
    return supabaseResponse
  }

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role as string)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|sw\\.js|manifest\\.webmanifest|manifest\\.json|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
