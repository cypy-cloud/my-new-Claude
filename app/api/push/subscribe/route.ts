import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { endpoint, keys } = await req.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await (admin as any)
    .from("push_subscriptions")
    .upsert({
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }, { onConflict: "user_id,endpoint" })

  if (error) {
    console.error('[push/subscribe]', error)
    return NextResponse.json({ error: '알림 구독 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { endpoint } = await req.json()
  const admin = createAdminClient()
  await (admin as any)
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint)

  return NextResponse.json({ ok: true })
}
