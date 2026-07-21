import { createAdminClient } from '@/lib/supabase/admin'

export type NotificationType = 'announcement' | 'usage_limit' | 'file_delete' | 'billing' | 'system' | 'team'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const supabase = createAdminClient()
    await (supabase as any).from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      action_url: params.actionUrl ?? null,
    })
  } catch {
    // 알림 생성 실패는 조용히 처리 — 본 기능에 영향 없어야 함
  }
}

export async function createNotificationForAllUsers(
  params: Omit<CreateNotificationParams, 'userId'>,
  target?: { plan?: string; role?: string },
) {
  try {
    const supabase = createAdminClient()
    let query = (supabase as any)
      .from('profiles')
      .select('id')
      .eq('status', 'active')

    if (target?.plan && target.plan !== 'all') query = query.eq('plan_type', target.plan)
    if (target?.role && target.role !== 'all') query = query.eq('role', target.role)

    const { data: users } = await query

    if (!users?.length) return

    const rows = users.map((u: { id: string }) => ({
      user_id: u.id,
      type: params.type,
      title: params.title,
      message: params.message,
      action_url: params.actionUrl ?? null,
    }))

    await (supabase as any).from('notifications').insert(rows)
  } catch {
    // 조용히 처리
  }
}

// 사용량 80% 이상일 때 알림 (중복 방지: 오늘 이미 보낸 경우 생략)
export async function notifyUsageLimitWarning(
  userId: string,
  featureLabel: string,
  used: number,
  limit: number,
) {
  try {
    const supabase = createAdminClient()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count } = await (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'usage_limit')
      .gte('created_at', todayStart.toISOString())

    if ((count ?? 0) > 0) return // 오늘 이미 발송

    const pct = Math.round((used / limit) * 100)
    await createNotification({
      userId,
      type: 'usage_limit',
      title: `${featureLabel} 사용량 ${pct}% 도달`,
      message: `이번 달 ${featureLabel} 사용량이 ${used}/${limit}회(${pct}%)에 달했습니다. 한도 초과 시 추가 생성이 불가합니다.`,
      actionUrl: '/billing',
    })
  } catch {
    // 조용히 처리
  }
}

// 구독 재결제 리마인더 (만료 3일 전 — 자동 정기결제가 없어 수동 재결제 필요)
export async function notifyRenewalReminder(
  userId: string,
  planLabel: string,
  expiresOn: string,
) {
  try {
    const supabase = createAdminClient()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count } = await (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'billing')
      .gte('created_at', todayStart.toISOString())

    if ((count ?? 0) > 0) return // 오늘 이미 발송

    await createNotification({
      userId,
      type: 'billing',
      title: `${planLabel} 플랜 만료 예정`,
      message: `${new Date(expiresOn).toLocaleDateString('ko-KR')}에 ${planLabel} 플랜 이용 기간이 끝납니다. 계속 이용하시려면 결제 페이지에서 재결제해주세요. (자동 결제가 아직 지원되지 않아 직접 재결제가 필요합니다)`,
      actionUrl: '/billing',
    })
  } catch {
    // 조용히 처리
  }
}

// 구독 만료로 무료 플랜 전환 알림
export async function notifyPlanExpired(userId: string, planLabel: string) {
  await createNotification({
    userId,
    type: 'billing',
    title: `${planLabel} 플랜이 만료되었습니다`,
    message: `이용 기간이 끝나 무료 플랜으로 전환되었습니다. 계속 유료 기능을 이용하시려면 다시 결제해주세요.`,
    actionUrl: '/billing',
  })
}

// 파일 삭제 예정 알림 (만료 3일 전)
export async function notifyFileDeleteWarning(
  userId: string,
  fileName: string,
  deleteAfter: string,
) {
  await createNotification({
    userId,
    type: 'file_delete',
    title: '파일 삭제 예정 안내',
    message: `"${fileName}" 파일이 ${new Date(deleteAfter).toLocaleDateString('ko-KR')} 에 자동 삭제됩니다. 필요한 경우 저장하세요.`,
    actionUrl: '/my-results',
  })
}
