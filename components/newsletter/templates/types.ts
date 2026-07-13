export interface NewsletterTemplateData {
  issueLabel: string      // 예: "2026년 6월호"
  title: string           // 뉴스레터 제목
  agentName: string       // 발행인(FP) 이름
  agentContact: string    // 연락처
  greeting: string
  issues: string[]        // 핵심 이슈 1~3
  checkPoints: string
  cta: string
  fontClassName: string
  bodyFontSize: string  // 내용량에 따라 자동 계산되는 본문 글자 크기 (예: '15px')
}

export interface NewsletterTemplateProps {
  data: NewsletterTemplateData
}
