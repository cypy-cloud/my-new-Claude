// 하위 호환성 유지: 기존 import가 이 파일을 참조하므로 새 파일로 re-export
export type {
  BillingProvider,
  CheckoutSession,
  PaymentResult as BillingResult,
  BillingProviderAdapter as ProviderAdapter,
} from './billing-provider'

export { getActiveProvider, getBillingAdapter } from './billing-provider'
