import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FP AI Assistant',
    short_name: 'FP AI',
    description: '보험설계사를 위한 AI 업무 자동화 앱',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#1e3a5f',
    theme_color: '#1e3a5f',
    lang: 'ko',
    scope: '/',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'AI 문자 생성',
        short_name: 'AI 문자',
        description: '고객 맞춤 AI 문자 즉시 생성',
        url: '/ai-message',
        icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
      },
      {
        name: '고객 관리',
        short_name: '고객',
        description: '고객 목록 및 상담 이력',
        url: '/customers',
        icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
      },
    ],
  }
}
