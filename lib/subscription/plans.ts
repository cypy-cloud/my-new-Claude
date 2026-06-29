export type PlanId = 'free' | 'basic' | 'pro' | 'premium'

export interface PlanLimits {
  smsLimit: number
  scriptLimit: number
  pdfUploadLimit: number
  pdfAnalysisLimit: number
  maxFileSizeMb: number
  storageDays: number
  priorityProcessing: boolean
  teamSharing: boolean
}

export interface Plan extends PlanLimits {
  id: PlanId
  name: string
  price: number
  currency: string
  interval: string
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: '무료',
    price: 0,
    currency: 'KRW',
    interval: 'month',
    smsLimit: 5,
    scriptLimit: 3,
    pdfUploadLimit: 1,
    pdfAnalysisLimit: 1,
    maxFileSizeMb: 5,
    storageDays: 7,
    priorityProcessing: false,
    teamSharing: false,
  },
  basic: {
    id: 'basic',
    name: '기본',
    price: 1900,
    currency: 'KRW',
    interval: 'month',
    smsLimit: 50,
    scriptLimit: 20,
    pdfUploadLimit: 3,
    pdfAnalysisLimit: 3,
    maxFileSizeMb: 10,
    storageDays: 30,
    priorityProcessing: false,
    teamSharing: false,
  },
  pro: {
    id: 'pro',
    name: '프로',
    price: 5900,
    currency: 'KRW',
    interval: 'month',
    smsLimit: 300,
    scriptLimit: 100,
    pdfUploadLimit: 20,
    pdfAnalysisLimit: 20,
    maxFileSizeMb: 30,
    storageDays: 180,
    priorityProcessing: false,
    teamSharing: false,
  },
  premium: {
    id: 'premium',
    name: '프리미엄',
    price: 9900,
    currency: 'KRW',
    interval: 'month',
    smsLimit: 1000,
    scriptLimit: 300,
    pdfUploadLimit: 50,
    pdfAnalysisLimit: 50,
    maxFileSizeMb: 50,
    storageDays: 365,
    priorityProcessing: true,
    teamSharing: true,
  },
}

export const PLAN_LABELS: Record<PlanId, string> = {
  free: '무료',
  basic: '기본',
  pro: '프로',
  premium: '프리미엄',
}

export function getPlanLimits(planId: string): PlanLimits {
  return PLANS[planId as PlanId] ?? PLANS.free
}
