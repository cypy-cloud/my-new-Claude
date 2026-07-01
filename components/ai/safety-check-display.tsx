"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronUp, AlertTriangle, Lightbulb } from "lucide-react"
import type { RiskLevel, SafetyIssue } from "@/lib/safety/safety-checker"

interface Props {
  text: string
  outputId?: string | null
  featureType: string
}

interface CheckResult {
  riskLevel: RiskLevel
  issues: SafetyIssue[]
}

const RISK_CONFIG = {
  low: {
    icon: ShieldCheck,
    label: '안전',
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    dot: 'bg-green-500',
  },
  medium: {
    icon: ShieldAlert,
    label: '주의',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 border-yellow-200',
    dot: 'bg-yellow-500',
  },
  high: {
    icon: ShieldX,
    label: '위험',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    dot: 'bg-red-500',
  },
}

export function SafetyCheckDisplay({ text, outputId, featureType }: Props) {
  const [result, setResult] = useState<CheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [checkedText, setCheckedText] = useState('')

  useEffect(() => {
    if (!text || text === checkedText) return

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/ai/safety-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, outputId, featureType }),
        })
        if (res.ok) {
          const data = await res.json()
          setResult({ riskLevel: data.riskLevel, issues: data.issues })
          setCheckedText(text)
          if (data.riskLevel !== 'low') setExpanded(true)
        }
      } catch {
        // 검사 실패는 조용히 처리
      } finally {
        setLoading(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [text, outputId, featureType, checkedText])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-gray-50 text-xs text-gray-500">
        <div className="h-3 w-3 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
        컴플라이언스 안전성 검사 중...
      </div>
    )
  }

  if (!result) return null

  const cfg = RISK_CONFIG[result.riskLevel]
  const Icon = cfg.icon
  const hasDanger = result.issues.some(i => i.severity === 'danger')

  return (
    <div className={`rounded-lg border ${cfg.bg} overflow-hidden`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
          <Icon className={`h-4 w-4 ${cfg.color}`} />
          <span className={`text-xs font-semibold ${cfg.color}`}>
            컴플라이언스 검사: {cfg.label}
          </span>
          {result.issues.length > 0 && (
            <span className={`text-xs ${cfg.color} opacity-70`}>
              ({result.issues.length}건 감지)
            </span>
          )}
        </div>
        {result.issues.length > 0 && (
          expanded
            ? <ChevronUp className={`h-4 w-4 ${cfg.color}`} />
            : <ChevronDown className={`h-4 w-4 ${cfg.color}`} />
        )}
      </button>

      {expanded && result.issues.length > 0 && (
        <div className="px-3 pb-3 space-y-2 border-t border-current/10">
          <p className="text-xs text-gray-500 mt-2">
            {hasDanger
              ? '⚠️ 아래 표현은 보험영업 관련 법규 위반 소지가 있습니다. 발송 전 반드시 수정하세요.'
              : '아래 표현은 주의가 필요합니다. 내용을 검토한 후 사용하세요.'}
          </p>
          <div className="space-y-2">
            {result.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`rounded-lg p-3 text-xs space-y-1.5 ${
                  issue.severity === 'danger'
                    ? 'bg-red-100 border border-red-200'
                    : 'bg-yellow-100 border border-yellow-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className={`h-3.5 w-3.5 ${
                    issue.severity === 'danger' ? 'text-red-500' : 'text-yellow-600'
                  }`} />
                  <span className={`font-semibold ${
                    issue.severity === 'danger' ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    {issue.categoryLabel}
                  </span>
                  <span className={`ml-auto px-1.5 py-0.5 rounded text-xs font-medium ${
                    issue.severity === 'danger'
                      ? 'bg-red-200 text-red-700'
                      : 'bg-yellow-200 text-yellow-700'
                  }`}>
                    {issue.severity === 'danger' ? '위험' : '주의'}
                  </span>
                </div>

                <div className="bg-white/60 rounded px-2 py-1">
                  <span className="text-gray-500">감지 표현: </span>
                  <span className={`font-mono font-medium ${
                    issue.severity === 'danger' ? 'text-red-600' : 'text-yellow-700'
                  }`}>
                    &ldquo;{issue.flaggedText}&rdquo;
                  </span>
                </div>

                <p className="text-gray-600">{issue.explanation}</p>

                <div className="flex items-start gap-1.5 bg-white/60 rounded px-2 py-1">
                  <Lightbulb className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span className="text-blue-700">{issue.suggestion}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && result.issues.length === 0 && (
        <div className="px-3 pb-3 pt-1 text-xs text-green-600">
          문제 있는 표현이 감지되지 않았습니다. 안전하게 사용하세요.
        </div>
      )}
    </div>
  )
}
