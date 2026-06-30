import { CustomerList } from "@/components/customers/customer-list"

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">고객 관리</h1>
        <p className="text-gray-600 mt-1">고객 정보를 등록하고, 문자/상담 스크립트 생성에 바로 활용하세요</p>
      </div>
      <CustomerList />
    </div>
  )
}
