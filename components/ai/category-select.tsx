"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"

interface CategoryOption {
  id: string
  name: string
  parent_id: string | null
  description: string | null
}

interface Props {
  value: string
  onChange: (categoryId: string) => void
  disabled?: boolean
}

// Shared select for the structured product_categories table (별도 — 기존 자유 텍스트
// '상품 분야' 선택과는 독립적으로, AI에 카테고리별 주의문구를 반영하기 위한 선택값).
export function CategorySelect({ value, onChange, disabled }: Props) {
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/product-categories")
        const data = await res.json()
        if (!cancelled) setCategories(data.categories ?? [])
      } catch { /* non-critical */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">보험상품 카테고리 <span className="text-gray-400 font-normal">(선택)</span></Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      >
        <option value="">{loading ? "불러오는 중..." : "선택 안 함"}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  )
}
