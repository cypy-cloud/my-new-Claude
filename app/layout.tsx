import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FP AI Assistant - 보험설계사를 위한 AI 업무 자동화',
  description: '보험설계사를 위한 AI 기반 문자/카톡 생성, 상담 스크립트, PDF 설명자료 자동화 서비스',
  keywords: ['보험설계사', 'AI', '보험', '문자생성', '스크립트', 'FP'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
