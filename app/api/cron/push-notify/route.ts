import { NextResponse } from "next/server"
import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase/admin"

function initVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (pub && priv) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL ?? "admin@fp-ai.kr"}`,
      pub,
      priv,
    )
    return true
  }
  return false
}

export async function GET(req: Request) {
  // Vercel cron 인증
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!initVapid()) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 })
  }

  const admin = createAdminClient()
  const now = new Date()

  // 향후 2시간 내 알림이 필요한 pending tasks 조회
  // due_date + due_time - notify_before_minutes <= now <= due_date + due_time
  const { data: tasks, error } = await (admin as any)
    .from("tasks")
    .select(`
      id, title, task_type, due_date, due_time,
      notify_before_minutes, user_id,
      customers(name)
    `)
    .eq("status", "pending")
    .not("notify_before_minutes", "is", null)
    .is("notified_at", null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const TYPE_LABELS: Record<string, string> = {
    followup: "후속 연락", meeting: "상담 예정", birthday: "고객 생일",
    renewal: "계약 갱신", review: "보험 점검", other: "일정",
  }

  let sent = 0
  const notifiedIds: string[] = []

  for (const task of tasks ?? []) {
    if (!task.due_time) continue

    // due_date/due_time은 사용자가 한국 시간(KST) 기준으로 입력한 값인데, Vercel 서버는
    // UTC로 동작하므로 시간대 오프셋 없이 파싱하면 9시간이 밀린다 — 반드시 +09:00을 명시한다.
    const dueAt = new Date(`${task.due_date}T${task.due_time}+09:00`)
    const notifyAt = new Date(dueAt.getTime() - task.notify_before_minutes * 60 * 1000)

    // 크론은 15분 간격으로만 도는데, "10분 전" 같은 짧은 알림 설정은 [notifyAt, dueAt] 구간이
    // 15분보다 좁아서 크론 실행 시점이 그 구간을 아예 비껴갈 수 있다(놓치면 다시는 안 옴).
    // 그래서 아직 못 보낸 알림은 일정 시각이 지난 뒤에도 30분간 유예를 두고 다음 크론에서
    // 잡아내도록 한다 — 정시 알림보다 늦더라도 "안 오는 것"보다는 낫다.
    const GRACE_MS = 30 * 60 * 1000
    if (now < notifyAt || now > new Date(dueAt.getTime() + GRACE_MS)) continue

    // 해당 유저의 push 구독 가져오기
    const { data: subs } = await (admin as any)
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", task.user_id)

    if (!subs?.length) continue

    // 크론 유예 시간 때문에 실제 발송 시점이 설정한 알림 시간보다 늦어질 수 있어(위 GRACE_MS
    // 참고), 설정값이 아니라 지금 이 순간 실제로 남은 시간을 기준으로 문구를 만든다.
    const minutesUntilDue = Math.round((dueAt.getTime() - now.getTime()) / 60000)
    const title =
      minutesUntilDue > 0
        ? `⏰ ${minutesUntilDue >= 60 ? `${Math.round(minutesUntilDue / 60)}시간` : `${minutesUntilDue}분`} 후 일정이 있습니다`
        : "⏰ 일정 시간이 되었습니다"

    const payload = JSON.stringify({
      title,
      body: `[${TYPE_LABELS[task.task_type] ?? "일정"}] ${task.title}${task.customers?.name ? ` — ${task.customers.name}` : ""}`,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      url: "/calendar",
    })

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent++
      } catch (e: any) {
        // 410 Gone = 구독 만료 → 삭제
        if (e?.statusCode === 410) {
          await (admin as any)
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint)
        }
      }
    }

    notifiedIds.push(task.id)
  }

  // 발송 완료된 tasks에 notified_at 기록
  if (notifiedIds.length > 0) {
    await (admin as any)
      .from("tasks")
      .update({ notified_at: now.toISOString() })
      .in("id", notifiedIds)
  }

  return NextResponse.json({ ok: true, sent, notified: notifiedIds.length })
}
