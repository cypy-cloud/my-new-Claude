import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventName, featureType, pagePath, metadata, deviceType, browser } = body

    if (!eventName) {
      return NextResponse.json({ error: 'eventName required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('event_logs').insert({
      user_id: user?.id ?? null,
      event_name: eventName,
      feature_type: featureType ?? null,
      page_path: pagePath ?? null,
      metadata: metadata ?? null,
      device_type: deviceType ?? null,
      browser: browser ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
