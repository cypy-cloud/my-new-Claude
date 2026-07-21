"use client"

import { useState, useEffect } from "react"
import { Zap, X, CheckCircle, Clock, Loader2, ShieldCheck, Lock, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CREDIT_PACKS, type CreditPack } from "@/lib/billing/credit-packs"

interface Props {
  open: boolean
  onClose: () => void
  featureLabel?: string
  planId?: string   // 현재 플랜 (free면 구매 불가)
  onSuccess?: (newTotal: number) => void
}

export function CreditsPurchaseModal({ open, onClose, featureLabel = "AI 기능", planId, onSuccess }: Props) {
  const [step, setStep] = useState<'confirm' | 'paying'>('confirm')
  const [currentCredits, setCurrentCredits] = useState<number | null>(null)
  const [selectedPack, setSelectedPack] = useState<CreditPack>(CREDIT_PACKS[0])
  const [hasBillingKey, setHasBillingKey] = useState(false)
  const [cardLast4, setCardLast4] = useState<string | null>(null)

  const isFreeUser = !planId || planId === 'free'

  useEffect(() => {
    if (!open) { setStep('confirm'); setSelectedPack(CREDIT_PACKS[0]); return }
    if (isFreeUser) return
    fetch('/api/billing/credits/purchase?feature=all')
      .then(r => r.json())
      .then(d => setCurrentCredits(d.totalCredits ?? 0))
      .catch(() => setCurrentCredits(0))
    fetch('/api/billing/card/status')
      .then(r => r.json())
      .then(d => { setHasBillingKey(!!d.hasBillingKey); setCardLast4(d.cardLast4 ?? null) })
      .catch(() => { setHasBillingKey(false); setCardLast4(null) })
  }, [open, isFreeUser])

  async function handlePurchase() {
    // 자동결제 카드가 없으면 결제 자체를 시도하지 않고 카드 등록부터 안내한다.
    // (예전엔 등록된 카드가 없을 때 단건결제 체크아웃으로 보냈는데, KPN MID가
    // 정기결제(빌링키) 전용이라 그 경로는 항상 실패함 — 2026-07-21 확인)
    if (!hasBillingKey) {
      toast.error("먼저 자동결제 카드 등록이 필요합니다")
      onClose()
      window.location.href = '/billing'
      return
    }

    setStep('paying')
    try {
      const res = await fetch('/api/billing/credits/charge-billing-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packSize: selectedPack.packSize, featureType: 'all' }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.noBillingKey) {
          toast.error("먼저 자동결제 카드 등록이 필요합니다")
          onClose()
          window.location.href = '/billing'
          return
        }
        toast.error(data.error ?? "결제에 실패했습니다")
        setStep('confirm')
        return
      }
      toast.success(data.message ?? "크레딧이 충전되었습니다")
      onSuccess?.(data.totalCredits)
      onClose()
    } catch {
      toast.error("결제 초기화에 실패했습니다")
      setStep('confirm')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 무료 플랜 차단 화면 */}
        {isFreeUser && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Lock className="h-7 w-7 text-gray-400" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-base mb-1">유료 플랜 전용 기능</h2>
              <p className="text-sm text-gray-500">추가 크레딧 구매는 Basic 이상 플랜에서만 가능합니다.</p>
            </div>
            <Button
              onClick={() => { onClose(); window.location.href = '/billing' }}
              className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white w-full"
            >
              요금제 업그레이드하기
            </Button>
          </div>
        )}

        {/* 유료 플랜 - 팩 선택 화면 */}
        {!isFreeUser && step === 'confirm' && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-base">추가 크레딧 구매</h2>
                <p className="text-xs text-gray-500">{featureLabel} 한도 초과 시 사용 · 30일 유효</p>
              </div>
            </div>

            {/* 팩 선택 그리드 */}
            <div className="grid grid-cols-1 gap-2 mb-4">
              {CREDIT_PACKS.map((pack) => {
                const isSelected = selectedPack.packSize === pack.packSize
                return (
                  <button
                    key={pack.packSize}
                    onClick={() => setSelectedPack(pack)}
                    className={`relative flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-purple-500' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">{pack.label}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">건당 ₩{pack.pricePerUnit}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pack.discountPct > 0 && (
                        <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded">
                          -{pack.discountPct}%
                        </span>
                      )}
                      {pack.badge && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          pack.badge === 'BEST'
                            ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          {pack.badge}
                        </span>
                      )}
                      <span className="font-bold text-sm text-purple-600 dark:text-purple-400 min-w-[60px] text-right">
                        ₩{pack.price.toLocaleString()}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 혜택 */}
            <ul className="space-y-1.5 mb-4">
              {[
                "스크립트·성향분석·SMS 문자 모두 사용 가능",
                "구매 후 30일간 유효 (미사용 크레딧 소멸)",
                "여러 팩 중복 구매 가능",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>

            {/* 현재 잔여 크레딧 */}
            {currentCredits !== null && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 mb-4">
                <Clock className="h-3.5 w-3.5" />
                현재 잔여 크레딧: <strong className="text-gray-700 dark:text-gray-300 ml-1">{currentCredits}건</strong>
              </div>
            )}

            {hasBillingKey ? (
              <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2 mb-4">
                <ShieldCheck className="h-3.5 w-3.5" />
                등록된 카드{cardLast4 ? ` (끝자리 ${cardLast4})` : ""}로 바로 결제됩니다
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 mb-4">
                <CreditCard className="h-3.5 w-3.5" />
                자동결제 카드 등록 후 구매할 수 있습니다
              </div>
            )}

            <Button onClick={handlePurchase} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold">
              {hasBillingKey
                ? <><Zap className="h-4 w-4 mr-1.5" />{selectedPack.label} ₩{selectedPack.price.toLocaleString()} 바로 결제하기</>
                : <><CreditCard className="h-4 w-4 mr-1.5" />카드 등록하러 가기</>
              }
            </Button>
            <div className="flex items-center justify-center gap-1 mt-2.5 text-xs text-gray-400">
              <ShieldCheck className="h-3 w-3" />
              포트원 안전 결제
            </div>
          </>
        )}

        {!isFreeUser && step === 'paying' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-400">결제 처리 중...</p>
          </div>
        )}
      </div>
    </div>
  )
}
