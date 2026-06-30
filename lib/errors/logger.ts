import { createAdminClient } from '@/lib/supabase/admin'

export type ErrorArea = 'auth' | 'ai' | 'upload' | 'payment' | 'admin' | 'database' | 'unknown'
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface LogErrorOptions {
  userId?: string | null
  area?: ErrorArea
  severity?: ErrorSeverity
  metadata?: Record<string, unknown>
  stack?: string
}

// 사용자에게 노출하는 친절한 메시지 (내부 에러 메시지 숨김)
const USER_FRIENDLY_MESSAGES: Record<ErrorArea, string> = {
  auth:     '인증 처리 중 문제가 발생했습니다. 다시 로그인해 주세요.',
  ai:       'AI 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  upload:   '파일 업로드 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  payment:  '결제 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  admin:    '관리자 기능 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  database: '데이터 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  unknown:  '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
}

const DEFAULT_USER_MESSAGE = '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'

export function getUserFriendlyMessage(area: ErrorArea = 'unknown'): string {
  return USER_FRIENDLY_MESSAGES[area] ?? DEFAULT_USER_MESSAGE
}

// 에러 심각도 자동 판단
function inferSeverity(err: unknown): ErrorSeverity {
  if (!(err instanceof Error)) return 'medium'
  const msg = err.message.toLowerCase()
  if (msg.includes('payment') || msg.includes('결제') || msg.includes('critical')) return 'critical'
  if (msg.includes('database') || msg.includes('auth') || msg.includes('unauthorized')) return 'high'
  if (msg.includes('timeout') || msg.includes('network') || msg.includes('rate limit')) return 'medium'
  return 'low'
}

// 주의: options.metadata에는 이름/연락처/주민번호 등 개인정보(PII)를 절대 담지 마세요.
// fileName, feature, errorCode 등 식별 불가능한 최소 정보만 허용합니다.
export async function logError(
  err: unknown,
  options: LogErrorOptions = {}
): Promise<string | null> {
  const {
    userId = null,
    area = 'unknown',
    severity,
    metadata = {},
    stack,
  } = options

  const errorMessage = err instanceof Error ? err.message : String(err)
  const stackTrace = stack ?? (err instanceof Error ? err.stack : undefined) ?? null
  const finalSeverity = severity ?? inferSeverity(err)

  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('error_logs')
      .insert({
        user_id: userId ?? null,
        area,
        error_message: errorMessage.slice(0, 2000),
        stack_trace: stackTrace ? stackTrace.slice(0, 5000) : null,
        metadata,
        severity: finalSeverity,
        resolved: false,
      })
      .select('id')
      .single()

    return data?.id ?? null
  } catch (logErr) {
    // 로깅 실패는 콘솔에만 출력 (무한루프 방지)
    console.error('[ErrorLogger] Failed to log error:', logErr)
    console.error('[ErrorLogger] Original error:', errorMessage)
    return null
  }
}

export async function markErrorResolved(
  errorId: string,
  resolvedBy: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('error_logs')
      .update({
        resolved: true,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', errorId)

    return !error
  } catch {
    return false
  }
}
