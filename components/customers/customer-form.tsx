"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ShieldAlert, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CUSTOMER_STATUS_LABELS, type Customer, type CustomerStatus } from "@/types"

const AGE_GROUPS = ["20대", "30대", "40대", "50대", "60대 이상"]
const GENDERS = ["남성", "여성", "미입력"]
const OCCUPATIONS = ["직장인", "자영업자", "공무원", "전문직", "주부", "학생", "은퇴자", "기타"]
const RELATIONSHIPS = ["신규 고객", "기존 고객", "지인/소개", "온라인 문의", "기타"]
const MARITAL_STATUSES = ["미혼", "기혼", "이혼/별거", "사별"]
const CHILDREN_OPTIONS = ["없음", "1명", "2명", "3명 이상"]
const INCOME_LEVELS = ["200만원 미만", "200~400만원", "400~600만원", "600만원 이상", "미입력"]
const PRODUCT_FIELDS = ["생명보험", "건강보험", "실손보험", "자동차보험", "연금보험", "저축보험", "어린이보험", "종신보험", "기타"]
const STATUSES: CustomerStatus[] = ["prospect", "active", "dormant", "contracted", "lost"]

const selectClass =
  "w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"

interface Props {
  customer?: Customer
}

export function CustomerForm({ customer }: Props) {
  const router = useRouter()
  const isEdit = !!customer

  const [name, setName] = useState(customer?.name ?? "")
  const [phone, setPhone] = useState(customer?.phone ?? "")
  const [ageGroup, setAgeGroup] = useState(customer?.age_group ?? "")
  const [gender, setGender] = useState(customer?.gender ?? "")
  const [job, setJob] = useState(customer?.job ?? "")
  const [relationshipType, setRelationshipType] = useState(customer?.relationship_type ?? "")
  const [familyStatus, setFamilyStatus] = useState(customer?.family_status ?? "")
  const [childrenStatus, setChildrenStatus] = useState(customer?.children_status ?? "")
  const [incomeLevel, setIncomeLevel] = useState(customer?.income_level ?? "")
  const [interestProducts, setInterestProducts] = useState<string[]>(customer?.interest_products ?? [])
  const [memo, setMemo] = useState(customer?.memo ?? "")
  const [tagsText, setTagsText] = useState((customer?.tags ?? []).join(", "))
  const [status, setStatus] = useState<CustomerStatus>(customer?.status ?? "prospect")
  const [isSubmitting, setIsSubmitting] = useState(false)

  function toggleProduct(p: string) {
    setInterestProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error("고객 이름을 입력해주세요"); return }

    setIsSubmitting(true)
    try {
      const tags = tagsText.split(",").map(t => t.trim()).filter(Boolean)
      const payload = {
        name, phone, ageGroup, gender, job, relationshipType,
        familyStatus, childrenStatus, incomeLevel, interestProducts,
        memo, tags, status,
      }
      const res = await fetch(isEdit ? `/api/customers/${customer!.id}` : "/api/customers", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "저장에 실패했습니다")

      toast.success(isEdit ? "고객 정보가 수정되었습니다" : "고객이 등록되었습니다")
      router.push(`/customers/${data.customer.id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">개인정보 입력 주의</p>
          <p className="text-xs mt-0.5 text-red-600">
            주민등록번호, 계좌번호, 건강/질병 진단 정보 등 민감정보는 어떤 항목에도 입력하지 마세요.
            연령대·직업군 등 일반적인 분류 정보만 입력해주세요.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">이름 <span className="text-red-500">*</span></Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="예: 홍길동" disabled={isSubmitting} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">연락처</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="예: 010-1234-5678" disabled={isSubmitting} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">연령대</Label>
          <select className={selectClass} value={ageGroup} onChange={e => setAgeGroup(e.target.value)} disabled={isSubmitting}>
            <option value="">선택</option>
            {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">성별</Label>
          <select className={selectClass} value={gender} onChange={e => setGender(e.target.value)} disabled={isSubmitting}>
            <option value="">선택</option>
            {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">직업</Label>
          <select className={selectClass} value={job} onChange={e => setJob(e.target.value)} disabled={isSubmitting}>
            <option value="">선택</option>
            {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">결혼 여부</Label>
          <select className={selectClass} value={familyStatus} onChange={e => setFamilyStatus(e.target.value)} disabled={isSubmitting}>
            <option value="">선택</option>
            {MARITAL_STATUSES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">자녀 여부</Label>
          <select className={selectClass} value={childrenStatus} onChange={e => setChildrenStatus(e.target.value)} disabled={isSubmitting}>
            <option value="">선택</option>
            {CHILDREN_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">소득 수준</Label>
          <select className={selectClass} value={incomeLevel} onChange={e => setIncomeLevel(e.target.value)} disabled={isSubmitting}>
            <option value="">선택</option>
            {INCOME_LEVELS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">고객과의 관계</Label>
        <select className={selectClass} value={relationshipType} onChange={e => setRelationshipType(e.target.value)} disabled={isSubmitting}>
          <option value="">선택</option>
          {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">관심 상품 분야 <span className="text-gray-400 font-normal">(복수 선택 가능)</span></Label>
        <div className="grid grid-cols-3 gap-1.5">
          {PRODUCT_FIELDS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => toggleProduct(p)}
              disabled={isSubmitting}
              className={`px-2 py-1.5 rounded-lg text-xs border transition-all text-left disabled:opacity-50 ${
                interestProducts.includes(p)
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">메모</Label>
        <Textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="예: 최근 자녀 출산, 건강보험 관심 표명함 (※ 민감정보는 입력하지 마세요)"
          className="min-h-[80px] resize-none text-sm"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">태그 <span className="text-gray-400 font-normal">(쉼표로 구분)</span></Label>
          <Input value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder="예: VIP, 갱신예정" disabled={isSubmitting} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">상태</Label>
          <select className={selectClass} value={status} onChange={e => setStatus(e.target.value as CustomerStatus)} disabled={isSubmitting}>
            {STATUSES.map(s => <option key={s} value={s}>{CUSTOMER_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="bg-[#1e3a5f] hover:bg-[#162d4a]">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "수정 저장" : "고객 등록"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          취소
        </Button>
      </div>
    </form>
  )
}
