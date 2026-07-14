export interface NewsletterSubcategory {
  id: string
  label: string
}

export interface NewsletterCategory {
  id: string
  emoji: string
  label: string
  subcategories: NewsletterSubcategory[]
}

export const NEWSLETTER_TOPIC_CATEGORIES: NewsletterCategory[] = [
  {
    id: 'health',
    emoji: '🏥',
    label: '건강/의료',
    subcategories: [
      { id: 'seasonal-disease', label: '계절성 질환 예방' },
      { id: 'checkup', label: '건강검진 안내' },
      { id: 'risk-disease', label: '특정질환 리스크(암/당뇨/뇌심혈관)' },
      { id: 'pre-existing', label: '유병력자 보험 팁' },
      { id: 'gender-health', label: '여성/남성 특화 건강정보' },
    ],
  },
  {
    id: 'finance',
    emoji: '💰',
    label: '금융/재테크',
    subcategories: [
      { id: 'interest-rate', label: '금리 동향과 저축전략' },
      { id: 'tax-saving', label: '절세 정보' },
      { id: 'pension', label: '연금·노후소득 준비' },
      { id: 'education-fund', label: '자녀 교육비 설계' },
      { id: 'real-estate', label: '부동산/자산관리 기초' },
    ],
  },
  {
    id: 'insurance-basics',
    emoji: '📋',
    label: '보험 상식/점검',
    subcategories: [
      { id: 'health-insurance-tips', label: '실손보험 200% 활용법' },
      { id: 'renewal-type', label: '갱신형 vs 비갱신형' },
      { id: 'coverage-gap', label: '보장 공백 점검' },
      { id: 'claim-tips', label: '보험금 청구 꿀팁' },
      { id: 'terms', label: '헷갈리는 보험 용어 쉽게 알기' },
    ],
  },
  {
    id: 'seasonal',
    emoji: '🌦️',
    label: '생활/시즌 이슈',
    subcategories: [
      { id: 'spring', label: '봄철(황사·알레르기)' },
      { id: 'summer', label: '여름철(폭염·장마·휴가)' },
      { id: 'autumn', label: '가을철(환절기)' },
      { id: 'winter', label: '겨울철(한파·빙판길·난방)' },
      { id: 'holiday', label: '명절·연말연시' },
    ],
  },
  {
    id: 'safety',
    emoji: '🚗',
    label: '생활안전/사고예방',
    subcategories: [
      { id: 'driver', label: '운전자보험 체크포인트' },
      { id: 'fire-disaster', label: '화재/재난 대비' },
      { id: 'travel', label: '여행·레저 안전' },
      { id: 'pet', label: '반려동물 안전' },
      { id: 'indoor', label: '실내 생활안전(낙상·가전사고 등)' },
    ],
  },
  {
    id: 'corporate',
    emoji: '💼',
    label: '법인/전문직 특화',
    subcategories: [
      { id: 'ceo-plan', label: '법인 CEO플랜·키맨보험' },
      { id: 'succession', label: '가업승계·법인자금 마련' },
      { id: 'corporate-tax', label: '법인 절세전략' },
      { id: 'liability', label: '전문직 배상책임보험' },
      { id: 'group-insurance', label: '전문직 그룹보험·소득보장' },
    ],
  },
  {
    id: 'relationship',
    emoji: '💌',
    label: '고객 관계관리·감사 콘텐츠',
    subcategories: [
      { id: 'anniversary', label: '계약 기념일·가입 O주년 축하' },
      { id: 'greeting', label: '명절·연말연시 인사' },
      { id: 'referral', label: '소개 감사 캠페인 안내' },
      { id: 'fp-update', label: '담당 FP 근황·전문성 소개' },
      { id: 'success-story', label: '고객 성공사례 공유(익명)' },
    ],
  },
]

export function findSubcategoryLabel(categoryId: string, subcategoryId: string): string | undefined {
  return NEWSLETTER_TOPIC_CATEGORIES
    .find(c => c.id === categoryId)
    ?.subcategories.find(s => s.id === subcategoryId)
    ?.label
}
