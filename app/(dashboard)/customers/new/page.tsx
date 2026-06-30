import { CustomerForm } from "@/components/customers/customer-form"

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">고객 등록</h1>
        <p className="text-gray-600 mt-1">새 고객 정보를 입력하세요</p>
      </div>
      <CustomerForm />
    </div>
  )
}
