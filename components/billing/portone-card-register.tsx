"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CreditCard, Loader2, ShieldCheck } from "lucide-react"

interface PortOneCardRegisterProps {
  userId: string
  storeId: string
  channelKey: string
  fullName: string
  phoneNumber?: string | null
  email?: string | null
  cardLast4?: string | null
  cardBrand?: string | null
}

export function PortOneCardRegister({
  userId,
  storeId,
  channelKey,
  fullName,
  phoneNumber,
  email,
  cardLast4,
  cardBrand,
}: PortOneCardRegisterProps) {
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const hasCard = !!cardLast4

  async function handleRegister() {
    setLoading(true)
    try {
      const PortOne = await import("@portone/browser-sdk/v2")
      const customerId = `fp_${userId.replace(/-/g, "").slice(0, 20)}`
      const issueResponse = await PortOne.requestIssueBillingKey({
        storeId,
        channelKey,
        billingKeyMethod: "CARD",
        issueId: `bk-${customerId}-${Date.now()}`,
        issueName: "FP AI Assistant 자동결제 카드 등록",
        customer: {
          customerId,
          fullName,
          phoneNumber: phoneNumber || undefined,
          email: email || undefined,
        },
      })

      if (issueResponse?.code) {
        toast.error(issueResponse.message ?? "카드 등록 중 오류가 발생했습니다")
        return
      }
      if (!issueResponse?.billingKey) {
        toast.error("카드 등록에 실패했습니다")
        return
      }

      const res = await fetch("/api/billing/card/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingKey: issueResponse.billingKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "카드 등록에 실패했습니다")

      toast.success("자동결제 카드가 등록되었습니다!")
      window.location.reload()
    } catch (e: any) {
      toast.error(e?.message ?? "카드 등록 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    if (!confirm("등록된 자동결제 카드를 삭제할까요? 다음 결제부터는 직접 재결제해야 합니다.")) return
    setRemoving(true)
    try {
      const res = await fetch("/api/billing/card/register", { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("자동결제 카드가 삭제되었습니다")
      window.location.reload()
    } catch {
      toast.error("카드 삭제에 실패했습니다")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="border rounded-xl p-4 bg-white space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-[#1e3a5f]" />
        <span className="font-semibold text-sm text-[#1e3a5f]">자동결제 카드</span>
      </div>
      {hasCard ? (
        <>
          <p className="text-sm text-gray-600">
            {cardBrand ? `${cardBrand} ` : ""}카드 (끝자리 {cardLast4}) 등록됨 — 매달 자동으로 결제됩니다.
          </p>
          <Button variant="outline" size="sm" onClick={handleRemove} disabled={removing} className="text-red-600 border-red-200 hover:bg-red-50">
            {removing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
            카드 삭제 (자동결제 해지)
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            카드를 등록하면 매달 자동으로 결제되어 직접 재결제할 필요가 없습니다.
          </p>
          <Button onClick={handleRegister} disabled={loading} className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
            자동결제 카드 등록
          </Button>
        </>
      )}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        포트원 보안 등록 · 카드 정보는 회사 서버에 저장되지 않습니다
      </div>
    </div>
  )
}
