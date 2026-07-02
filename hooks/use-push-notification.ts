"use client"

import { useState, useEffect } from "react"

export type PushPermission = "default" | "granted" | "denied"

export function usePushNotification() {
  const [permission, setPermission] = useState<PushPermission>("default")
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    setPermission(Notification.permission as PushPermission)

    // 이미 구독 중인지 확인
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setSubscribed(!!sub)
        })
      }).catch(() => {})
    }
  }, [])

  async function subscribe(): Promise<boolean> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("이 브라우저는 푸시 알림을 지원하지 않습니다.")
      return false
    }

    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm as PushPermission)
      if (perm !== "granted") return false

      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) throw new Error("VAPID key not configured")

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      })

      const subJson = sub.toJSON()
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      })

      if (!res.ok) throw new Error("서버 저장 실패")
      setSubscribed(true)
      return true
    } catch (e) {
      console.error("Push subscribe error:", e)
      return false
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe(): Promise<void> {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return

      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }

  return { permission, subscribed, loading, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
