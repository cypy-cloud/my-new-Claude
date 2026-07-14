"use client"

import { Bell, BellOff, BellRing, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePushNotification } from "@/hooks/use-push-notification"
import { toast } from "sonner"

export function PushNotificationToggle() {
  const { permission, subscribed, loading, subscribe, unsubscribe } = usePushNotification()

  // 브라우저 지원 여부
  if (typeof window !== "undefined" && !("PushManager" in window)) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <BellOff className="h-4 w-4" />
        이 브라우저는 푸시 알림을 지원하지 않습니다
      </div>
    )
  }

  if (permission === "denied") {
    return (
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
        <BellOff className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">알림이 차단되어 있습니다</p>
          <p className="text-amber-600 text-xs mt-0.5">
            브라우저 주소창 좌측 🔒 아이콘 → 알림 → 허용으로 변경 후 새로고침해주세요.
          </p>
        </div>
      </div>
    )
  }

  async function handleToggle() {
    if (subscribed) {
      await unsubscribe()
      toast.success("일정 알림을 해제했습니다")
    } else {
      const ok = await subscribe()
      if (ok) {
        toast.success("일정 알림이 활성화되었습니다! 🔔")
      } else if (permission === "denied") {
        toast.error("알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.")
      } else {
        toast.error("알림 활성화에 실패했습니다. iOS는 홈 화면에 추가한 앱에서만 알림이 지원됩니다.")
      }
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-white border rounded-xl">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${subscribed ? "bg-orange-100" : "bg-gray-100"}`}>
          {subscribed
            ? <BellRing className="h-5 w-5 text-orange-500" />
            : <Bell className="h-5 w-5 text-gray-400" />
          }
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {subscribed ? "일정 알림 켜짐" : "일정 알림 꺼짐"}
          </p>
          <p className="text-xs text-gray-500">
            {subscribed
              ? "일정 시간 전 푸시 알림을 받고 있습니다"
              : "일정 등록 시 설정한 시간 전에 알림을 받을 수 있습니다"
            }
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant={subscribed ? "outline" : "default"}
        onClick={handleToggle}
        disabled={loading}
        className={subscribed ? "" : "bg-orange-500 hover:bg-orange-600 text-white"}
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : subscribed ? "알림 끄기" : "알림 켜기"
        }
      </Button>
    </div>
  )
}
