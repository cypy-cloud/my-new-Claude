// 하위 호환성: payment-webhook으로 re-export
export { handleWebhookEvent as handleWebhook } from './payment-webhook'
export type { WebhookEvent as WebhookPayload } from './payment-webhook'
