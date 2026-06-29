"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { clientTrackUpgradeClick } from "@/lib/analytics/client-track"

interface Props {
  planId: string
  isCurrent: boolean
  isDowngrade: boolean
}

export function UpgradeButton({ planId, isCurrent, isDowngrade }: Props) {
  const label = isCurrent ? "현재 사용 중" : isDowngrade ? "다운그레이드" : "업그레이드"

  return (
    <Button
      className="w-full mt-4"
      variant={isCurrent || isDowngrade ? "outline" : "default"}
      disabled={isCurrent}
      onClick={() => {
        if (!isCurrent && !isDowngrade) {
          clientTrackUpgradeClick({ targetPlan: planId })
        }
      }}
      asChild={!isCurrent}
    >
      {isCurrent ? (
        <span>{label}</span>
      ) : (
        <Link href={`/billing/checkout?plan=${planId}`}>{label}</Link>
      )}
    </Button>
  )
}
