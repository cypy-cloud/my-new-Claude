"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { clientTrackUpgradeClick } from "@/lib/analytics/client-track"

interface Props {
  planId: string
  isCurrent: boolean
  isDowngrade: boolean
}

export function UpgradeButton({ planId, isCurrent, isDowngrade }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const label = isCurrent ? "현재 사용 중" : isDowngrade ? "다운그레이드" : "업그레이드"

  async function handleClick() {
    if (isCurrent) return
    clientTrackUpgradeClick({ targetPlan: planId })

    if (isDowngrade) {
      router.push(`/billing/checkout?plan=${planId}&action=downgrade`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '결제 준비에 실패했습니다')
        return
      }
      router.push(data.checkoutUrl)
    } catch {
      toast.error('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      className="w-full mt-4"
      variant={isCurrent || isDowngrade ? "outline" : "default"}
      disabled={isCurrent || loading}
      onClick={handleClick}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
      {label}
    </Button>
  )
}
