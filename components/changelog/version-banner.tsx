"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X, Rocket } from "lucide-react"

interface AppVersion {
  id: string
  version: string
  title: string
  is_current: boolean
  isRead: boolean
}

export function VersionBanner() {
  const [version, setVersion] = useState<AppVersion | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/app-versions?limit=5')
      .then(r => r.json())
      .then(d => {
        const list: AppVersion[] = d.versions ?? []
        const current = list.find(v => v.is_current && !v.isRead)
        if (current) setVersion(current)
      })
      .catch(() => {})
  }, [])

  async function dismiss() {
    if (!version) return
    setDismissed(true)
    await fetch('/api/app-versions/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId: version.id }),
    }).catch(() => {})
  }

  if (!version || dismissed) return null

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-orange-50 border-orange-200 text-orange-700 text-sm">
      <Rocket className="h-4 w-4 shrink-0" />
      <p className="flex-1 font-medium">
        새 버전 {version.version}이 출시되었습니다: {version.title}
      </p>
      <Link href="/changelog" onClick={dismiss} className="text-xs font-semibold underline shrink-0">
        자세히 보기
      </Link>
      <button onClick={dismiss} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
