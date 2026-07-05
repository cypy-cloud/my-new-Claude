export type PlanId = 'free' | 'basic' | 'pro' | 'premium'

export interface PlanLimits {
  smsLimit: number
  scriptLimit: number
  followupLimit: number
  pdfUploadLimit: number
  pdfAnalysisLimit: number
  contentLimit: number
  newsletterLimit: number
  maxFileSizeMb: number
  storageDays: number
  priorityProcessing: boolean
  teamSharing: boolean
}

export interface Plan extends PlanLimits {
  id: PlanId
  name: string
  price: number
  annualPrice: number
  currency: string
  interval: string
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: '무료',
    price: 0,
    annualPrice: 0,
    currency: 'KRW',
    interval: 'month',
    smsLimit: 3,
    scriptLimit: 0,
    followupLimit: 3,
    pdfUploadLimit: 0,
    pdfAnalysisLimit: 0,
    contentLimit: 0,
    newsletterLimit: 0,
    maxFileSizeMb: 5,
    storageDays: 7,
    priorityProcessing: false,
    teamSharing: false,
  },
  basic: {
    id: 'basic',
    name: '기본',
    price: 2900,
    annualPrice: 29000,
    currency: 'KRW',
    interval: 'month',
    smsLimit: 15,
    scriptLimit: 10,
    followupLimit: 10,
    pdfUploadLimit: 2,
    pdfAnalysisLimit: 2,
    contentLimit: 0,
    newsletterLimit: 0,
    maxFileSizeMb: 10,
    storageDays: 30,
    priorityProcessing: false,
    teamSharing: false,
  },
  pro: {
    id: 'pro',
    name: '프로',
    price: 6900,
    annualPrice: 69000,
    currency: 'KRW',
    interval: 'month',
    smsLimit: 50,
    scriptLimit: 20,
    followupLimit: 25,
    pdfUploadLimit: 8,
    pdfAnalysisLimit: 6,
    contentLimit: 10,
    newsletterLimit: 0,
    maxFileSizeMb: 30,
    storageDays: 180,
    priorityProcessing: false,
    teamSharing: false,
  },
  premium: {
    id: 'premium',
    name: '프리미엄',
    price: 14900,
    annualPrice: 149000,
    currency: 'KRW',
    interval: 'month',
    smsLimit: 100,
    scriptLimit: 45,
    followupLimit: 50,
    pdfUploadLimit: 20,
    pdfAnalysisLimit: 10,
    contentLimit: 20,
    newsletterLimit: 10,
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
