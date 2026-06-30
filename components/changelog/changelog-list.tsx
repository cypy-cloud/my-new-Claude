"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Rocket, ChevronDown, ChevronUp, Loader2 } from "lucide-react"

interface AppVersion {
  id: string
  version: string
  title: string
  description: string | null
  changes: string[]
  release_date: string
  is_current: boolean
  created_at: string
  isRead: boolean
}

export function ChangelogList() {
  const [versions, setVersions] = useState<AppVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/app-versions?limit=30')
      .then(r => r.json())
      .then(d => setVersions(d.versions ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function toggleExpand(id: string) {
    const next = expandedId === id ? null : id
    setExpandedId(next)
    if (next) {
      const version = versions.find(v => v.id === next)
      if (version && !version.isRead) {
        await fetch('/api/app-versions/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionId: id }),
        }).catch(() => {})
        setVersions(prev => prev.map(v => v.id === id ? { ...v, isRead: true } : v))
      }
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
  )

  if (versions.length === 0) return (
    <div className="flex flex-col items-center py-20 text-gray-400 gap-3">
      <Rocket className="h-10 w-10 text-gray-200" />
      <p>등록된 버전이 없습니다</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {versions.map(v => {
        const isExpanded = expandedId === v.id
        return (
          <Card key={v.id} className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${!v.isRead ? 'ring-1 ring-blue-100' : ''}`}>
            <CardContent className="p-0">
              <div className="flex items-start gap-3 p-4" onClick={() => toggleExpand(v.id)}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  v.is_current ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Rocket className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {v.is_current && (
                      <Badge className="text-xs bg-orange-100 text-orange-600 border border-orange-200">현재 버전</Badge>
                    )}
                    <Badge className="text-xs bg-gray-100 text-gray-600 border border-gray-200">{v.version}</Badge>
                    {!v.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800">{v.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(v.release_date).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                <div className="shrink-0 text-gray-400">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                  {v.description && (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line mt-3">
                      {v.description}
                    </p>
                  )}
                  {v.changes.length > 0 && (
                    <ul className="text-sm text-gray-700 mt-3 list-disc list-inside space-y-1">
                      {v.changes.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
