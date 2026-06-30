import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredFiles } from '@/lib/files/cleanup'

// 추후 cron job(예: Vercel Cron, Supabase Edge Function 스케줄러)에서 호출할 엔드포인트.
// Authorization: Bearer <CRON_SECRET> 헤더로 인증한다. CRON_SECRET이 설정되지 않으면 비활성화 상태로 동작한다.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET이 설정되지 않았습니다' }, { status: 503 })
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const result = await cleanupExpiredFiles()
  return NextResponse.json(result)
}
