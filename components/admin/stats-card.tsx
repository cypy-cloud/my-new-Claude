import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  highlight?: boolean
  trend?: { value: number; label: string }
}

export function StatsCard({ label, value, sub, icon: Icon, iconBg = "bg-blue-50", iconColor = "text-blue-600", highlight, trend }: Props) {
  return (
    <Card className={`border-0 shadow-sm ${highlight ? "ring-2 ring-[#1e3a5f]/20" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
        <p className={`text-2xl font-bold ${highlight ? "text-[#1e3a5f]" : "text-gray-800"}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        {trend && (
          <p className={`text-xs mt-1 font-medium ${trend.value >= 0 ? "text-green-600" : "text-red-500"}`}>
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
