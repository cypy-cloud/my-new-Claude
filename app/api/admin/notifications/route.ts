import { NextRequest, NextResponse } from 'next/server'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import { createNotification, createNotificationForAllUsers } from '@/lib/notifications/create-notification'
import type { NotificationType } from '@/lib/notifications/create-notification'

// POST: 관리자가 특정 사용자 또는 전체에 알림 발송
export async function POST(req: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const body = await req.json()
  const { userId, targetAll, type, title, message, actionUrl } = body

  if (!type || !title || !message) {
    return NextResponse.json({ error: '필수 항목 누락 (type, title, message)' }, { status: 400 })
  }

  const validTypes: NotificationType[] = ['announcement', 'usage_limit', 'file_delete', 'billing', 'system', 'team']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: '유효하지 않은 type' }, { status: 400 })
  }

  if (targetAll) {
    await createNotificationForAllUsers({ type, title, message, actionUrl })
    return NextResponse.json({ ok: true, target: 'all' })
  }

  if (!userId) {
    return NextResponse.json({ error: 'userId 또는 targetAll 필요' }, { status: 400 })
  }

  await createNotification({ userId, type, title, message, actionUrl })
  return NextResponse.json({ ok: true, target: userId })
}
