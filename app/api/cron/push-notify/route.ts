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

    const dueAt = new Date(`${task.due_date}T${task.due_time}`)
    const notifyAt = new Date(dueAt.getTime() - task.notify_before_minutes * 60 * 1000)

    // 현재 시각이 알림 시각에 도달했고, 아직 일정 시각이 지나지 않은 경우
    if (now < notifyAt || now > dueAt) continue

    // 해당 유저의 push 구독 가져오기
    const { data: subs } = await (admin as any)
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", task.user_id)

    if (!subs?.length) continue

    const minuteLabel =
      task.notify_before_minutes >= 60
        ? `${task.notify_before_minutes / 60}시간`
        : `${task.notify_before_minutes}분`

    const payload = JSON.stringify({
      title: `⏰ ${minuteLabel} 후 일정이 있습니다`,
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
