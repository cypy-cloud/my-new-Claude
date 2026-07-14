"use client"

import { useEffect, useState } from "react"
import { Sparkles, X } from "lucide-react"
import { SALES_QUOTES } from "@/lib/content/sales-quotes"

const STORAGE_KEY = "fp-ai-daily-quote-shown"

// 오늘 날짜(연중 일수) 기준으로 전 사용자가 같은 명언을 보도록 계산.
// 개인별 상태가 아니라 "오늘의 명언"이라는 공통 경험을 만들기 위함.
function getTodaysQuote() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  return SALES_QUOTES[dayOfYear % SALES_QUOTES.length]
}

function getTodayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}

export function DailyQuotePopup() {
  const [open, setOpen] = useState(false)
  const [quote, setQuote] = useState<{ text: string; author?: string } | null>(null)

  useEffect(() => {
    const todayKey = getTodayKey()
    const lastShown = localStorage.getItem(STORAGE_KEY)
    if (lastShown === todayKey) return

    setQuote(getTodaysQuote())
    setOpen(true)
    localStorage.setItem(STORAGE_KEY, todayKey)
  }, [])

  if (!open || !quote) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-300"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(160deg, #1e3a5f 0%, #2d5a9e 100%)" }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-10 py-12 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] text-orange-300 uppercase mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            오늘의 동기부여
          </div>

          <p className="text-white text-2xl leading-relaxed font-bold" style={{ wordBreak: "keep-all" }}>
            “{quote.text}”
          </p>

          {quote.author && (
            <p className="mt-5 text-sm text-white/70">— {quote.author}</p>
          )}

          <button
            onClick={() => setOpen(false)}
            className="mt-8 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors border border-white/20"
          >
            오늘도 힘내세요 💪
          </button>
        </div>
      </div>
    </div>
  )
}
