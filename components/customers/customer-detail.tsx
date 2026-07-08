"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MessageSquare, BookOpen, Pencil, Trash2, Phone, ShieldAlert, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CUSTOMER_STATUS_LABELS, type Customer, type CustomerStatus } from "@/types"
import { InteractionTimeline } from "@/components/customers/interaction-timeline"

const STATUS_VARIANT: Record<CustomerStatus, "default" | "secondary" | "destructive" | "outline"> = {
  prospect: "outline",
  active: "default",
  dormant: "secondary",
  contracted: "default",
  lost: "destructive",
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800">{value || "—"}</p>
    </div>
  )
}

export function CustomerDetail({ customer }: { customer: Customer }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`"${customer.name}" 고객 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("고객 정보가 삭제되었습니다")
      router.push("/customers")
      router.refresh()
    } catch {
      toast.error("삭제에 실패했습니다")
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{customer.name}</h2>
              {customer.phone && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <Phone className="h-3.5 w-3.5" />{customer.phone}
                </p>
              )}
            </div>
            <Badge variant={STATUS_VARIANT[customer.status]}>{CUSTOMER_STATUS_LABELS[customer.status]}</Badge>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="연령대" value={customer.age_group} />
            <Field label="성별" value={customer.gender} />
            <Field label="직업" value={customer.job} />
            <Field label="결혼 여부" value={customer.family_status} />
            <Field label="자녀 여부" value={customer.children_status} />
            <Field label="소득 수준" value={customer.income_level} />
            <Field label="고객과의 관계" value={customer.relationship_type} />
          </div>

          {customer.interest_products.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">관심 상품 분야</p>
              <div className="flex flex-wrap gap-1.5">
                {customer.interest_products.map(p => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}
              </div>
            </div>
          )}

          {customer.memo && (
            <div>
              <p className="text-xs text-gray-400 mb-1">메모</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border">{customer.memo}</p>
            </div>
          )}

          {customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {customer.tags.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">#{t}</span>
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>이 고객 정보에는 주민등록번호, 계좌번호, 건강정보 등 민감정보가 포함되어서는 안 됩니다.</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href={`/ai-message?customerId=${customer.id}`}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <MessageSquare className="mr-2 h-4 w-4" />문자 생성
          </Button>
        </Link>
        <Link href={`/ai-script?customerId=${customer.id}`}>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <BookOpen className="mr-2 h-4 w-4" />상담 스크립트 생성
          </Button>
        </Link>
        <Link href={`/customers/${customer.id}/edit`}>
          <Button variant="outline"><Pencil className="mr-2 h-4 w-4" />수정</Button>
        </Link>
        <Button variant="outline" onClick={handleDelete} disabled={isDeleting} className="text-red-600 border-red-200 hover:bg-red-50">
          <Trash2 className="mr-2 h-4 w-4" />삭제
        </Button>
      </div>

      <Link href={`/calendar?customer_id=${customer.id}`}>
        <Button variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
          <Calendar className="mr-2 h-4 w-4" />일정 관리
        </Button>
      </Link>

      <InteractionTimeline customerId={customer.id} />
    </div>
  )
}
