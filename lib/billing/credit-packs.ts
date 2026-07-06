export interface CreditPack {
  packSize: number
  price: number      // ₩
  pricePerUnit: number
  discountPct: number
  label: string
  badge?: string
}

export const CREDIT_PACKS: CreditPack[] = [
  { packSize: 10, price: 2000, pricePerUnit: 200, discountPct: 0,  label: '10건',  badge: undefined },
  { packSize: 20, price: 3800, pricePerUnit: 190, discountPct: 5,  label: '20건',  badge: undefined },
  { packSize: 30, price: 5400, pricePerUnit: 180, discountPct: 10, label: '30건',  badge: 'POPULAR' },
  { packSize: 40, price: 6800, pricePerUnit: 170, discountPct: 15, label: '40건',  badge: undefined },
  { packSize: 50, price: 8000, pricePerUnit: 160, discountPct: 20, label: '50건',  badge: 'BEST' },
]

// 유효한 팩인지 서버측 검증용
export const VALID_PACK_MAP: Record<number, number> = Object.fromEntries(
  CREDIT_PACKS.map(p => [p.packSize, p.price])
)
