export const PLANS = {
  FREE: {
    id: "free",
    name: "무료",
    price: 0,
    currency: "KRW",
    interval: "month",
    features: {
      aiMessageLimit: 5,
      aiScriptLimit: 3,
      aiDocumentLimit: 1,
      maxFileSize: 5,
      supportLevel: "community",
    },
  },
  PRO: {
    id: "pro",
    name: "프로",
    price: 29000,
    currency: "KRW",
    interval: "month",
    features: {
      aiMessageLimit: 200,
      aiScriptLimit: 100,
      aiDocumentLimit: 30,
      maxFileSize: 20,
      supportLevel: "email",
    },
  },
  TEAM: {
    id: "team",
    name: "팀",
    price: 79000,
    currency: "KRW",
    interval: "month",
    features: {
      aiMessageLimit: 1000,
      aiScriptLimit: 500,
      aiDocumentLimit: 150,
      maxFileSize: 50,
      supportLevel: "priority",
      maxMembers: 5,
    },
  },
} as const

export type PlanId = keyof typeof PLANS
