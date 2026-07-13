import { TemplateMinimal } from './template-minimal'
import { TemplateClassic } from './template-classic'
import { TemplateWarm } from './template-warm'
import { TemplateMagazineGrid } from './template-magazine-grid'
import { TemplateDark } from './template-dark'
import { TemplateMagazine } from './template-magazine'
import type { NewsletterTemplateProps } from './types'

export type { NewsletterTemplateData, NewsletterTemplateProps } from './types'

export type NewsletterTemplateId = 'minimal' | 'classic' | 'warm' | 'magazine-grid' | 'dark' | 'magazine'

export const NEWSLETTER_TEMPLATES: {
  id: NewsletterTemplateId
  label: string
  description: string
  component: (props: NewsletterTemplateProps) => React.ReactElement
}[] = [
  { id: 'minimal', label: '미니멀 화이트', description: '여백이 넉넉한 정갈한 스타일', component: TemplateMinimal },
  { id: 'classic', label: '클래식 네이비', description: '보험사 공식 문서 느낌의 격식있는 스타일', component: TemplateClassic },
  { id: 'warm', label: '웜 코럴', description: '친근하고 따뜻한 라운드 카드 스타일', component: TemplateWarm },
  { id: 'magazine-grid', label: '매거진 그리드형', description: '헤더 배너 + 2단 그리드의 정식 기관 뉴스레터 스타일', component: TemplateMagazineGrid },
  { id: 'dark', label: '다크 프리미엄', description: '골드 포인트의 고급스러운 스타일', component: TemplateDark },
  { id: 'magazine', label: '매거진 카드형', description: '잡지처럼 굵은 타이포의 스타일', component: TemplateMagazine },
]

export function getNewsletterTemplate(id: NewsletterTemplateId) {
  return NEWSLETTER_TEMPLATES.find(t => t.id === id) ?? NEWSLETTER_TEMPLATES[0]
}
