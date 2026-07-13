import { Noto_Sans_KR, Noto_Serif_KR, Gowun_Dodum } from 'next/font/google'

// 뉴스레터 이미지 내보내기 전용 폰트 — next/font가 자체 호스팅해주기 때문에
// html-to-image로 캡쳐할 때 외부 폰트 CORS 문제 없이 안전하게 렌더링된다.
// (globals.css의 앱 전체 폰트와는 별개로, 이 기능 안에서만 쓰인다)

export const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-newsletter-sans',
  display: 'swap',
})

export const notoSerifKr = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-newsletter-serif',
  display: 'swap',
})

export const gowunDodum = Gowun_Dodum({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-newsletter-round',
  display: 'swap',
})

export type NewsletterFontId = 'sans' | 'serif' | 'round'

export const NEWSLETTER_FONTS: { id: NewsletterFontId; label: string; className: string }[] = [
  { id: 'sans', label: '고딕 (깔끔)', className: notoSansKr.className },
  { id: 'serif', label: '명조 (격식있는)', className: notoSerifKr.className },
  { id: 'round', label: '둥근 고딕 (친근한)', className: gowunDodum.className },
]

export function getNewsletterFontClassName(id: NewsletterFontId): string {
  return NEWSLETTER_FONTS.find(f => f.id === id)?.className ?? notoSansKr.className
}
