import { NextResponse } from 'next/server'
import { logError, getUserFriendlyMessage, type ErrorArea, type ErrorSeverity } from './logger'

export interface HandleApiErrorOptions {
  userId?: string | null
  area?: ErrorArea
  severity?: ErrorSeverity
  metadata?: Record<string, unknown>
  // 특정 에러 타입에 대해 사용자 메시지를 오버라이드
  userMessage?: string
  // 내부 에러를 사용자에게 노출 여부 (기본: false)
  exposeMessage?: boolean
}

// Route Handler에서 catch 블록에 사용
export async function handleApiError(
  err: unknown,
  options: HandleApiErrorOptions = {}
): Promise<NextResponse> {
  const {
    userId,
    area = 'unknown',
    severity,
    metadata = {},
    userMessage,
    exposeMessage = false,
  } = options

  // 에러 ID 기록 (비동기, 응답을 블록하지 않음)
  const errorId = await logError(err, { userId, area, severity, metadata })

  // 이미 NextResponse이면 그대로 반환
  if (err instanceof NextResponse) return err

  // 사용량 초과 등 예상된 에러는 그대로 전달
  if (err instanceof Error && err.name === 'UsageLimitError') {
    return NextResponse.json(
      { error: err.message },
      { status: 429 }
    )
  }

  // 중복 요청 에러
  if (err instanceof Error && err.name === 'DuplicateRequestError') {
    return NextResponse.json(
      { error: err.message },
      { status: 409 }
    )
  }

  const safeMessage = userMessage ?? getUserFriendlyMessage(area)
  const responseBody: Record<string, unknown> = { error: safeMessage }

  // 개발 환경에서는 내부 메시지 노출
  if (process.env.NODE_ENV === 'development' || exposeMessage) {
    responseBody.detail = err instanceof Error ? err.message : String(err)
  }

  if (errorId) responseBody.errorId = errorId

  console.error(`[API Error][${area}]`, err)

  return NextResponse.json(responseBody, { status: 500 })
}

// 인증 실패 전용 (401)
export async function handleAuthError(
  err: unknown,
  userId?: string | null
): Promise<NextResponse> {
  await logError(err, { userId, area: 'auth', severity: 'high' })
  return NextResponse.json(
    { error: getUserFriendlyMessage('auth') },
    { status: 401 }
  )
}
