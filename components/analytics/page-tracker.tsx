"use client"

import { useEffect } from "react"
import type { EventName } from "@/lib/analytics/track"
import { clientTrackEvent } from "@/lib/analytics/client-track"

export function PageTracker({ event }: { event: EventName }) {
  useEffect(() => {
    clientTrackEvent(event)
  }, [event])

  return null
}
