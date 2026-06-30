"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Search, UserPlus, Phone } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CUSTOMER_STATUS_LABELS, type Customer, type CustomerStatus } from "@/types"

const STATUSES: CustomerStatus[] = ["prospect", "active", "dormant", "contracted", "lost"]

const STATUS_VARIANT: Record<CustomerStatus, "default" | "secondary" | "destructive" | "outline"> = {
  prospect: "outline",
  active: "default",
  dormant: "secondary",
  contracted: "default",
  lost: "destructive",
}

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [q, setQ] = useState("")
  const [tag, setTag] = useState("")
  const [status, setStatus] = useState("")

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (tag) params.set("tag", tag)
      if (status) params.set("status", status)
      const res = await fetch(`/api/customers?${params.toString()}`)
      const data = await res.json()
      setCustomers(data.customers ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [q, tag, status])

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300)
    return () => clearTimeout(timer)
  }, [fetchCustomers])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="이름, 연락처, 메모 검색"
              value={q}
              onChange={e => setQ(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Input
            placeholder="태그로 필터"
            value={tag}
            onChange={e => setTag(e.target.value)}
            className="w-40 h-9 text-sm"
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">전체 상태</option>
            {STATUSES.map(s => <option key={s} value={s}>{CUSTOMER_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <Link href="/customers/new">
          <Button className="bg-[#1e3a5f] hover:bg-[#162d4a] h-9">
            <UserPlus className="mr-2 h-4 w-4" />고객 등록
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center text-sm text-gray-400 py-12">불러오는 중...</div>
      ) : customers.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-12">등록된 고객이 없습니다</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {customers.map(c => (
            <Link key={c.id} href={`/customers/${c.id}`}>
              <Card className="p-4 hover:border-blue-300 transition-colors h-full">
                <div className="flex items-start justify-between">
                  <span className="font-medium text-gray-900">{c.name}</span>
                  <Badge variant={STATUS_VARIANT[c.status]} className="text-xs">
                    {CUSTOMER_STATUS_LABELS[c.status]}
                  </Badge>
                </div>
                {c.phone && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Phone className="h-3 w-3" />{c.phone}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {[c.age_group, c.job].filter(Boolean).join(" · ") || "정보 없음"}
                </p>
                {c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.tags.map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">#{t}</span>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
