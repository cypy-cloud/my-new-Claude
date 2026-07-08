import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  // pdf-parse는 pdf.worker.mjs를 별도 워커 스레드로 띄우고 pdfjs-dist의 cmaps,
  // @napi-rs/canvas 네이티브 바이너리를 런타임 파일 경로로 불러온다. 정적 분석
  // 기반 트레이싱이 이 파일들을 놓치면 서버리스 배포에서만 파싱이 실패하므로 명시적으로 포함시킨다.
  outputFileTracingIncludes: {
    '/api/files/upload': [
      './node_modules/pdf-parse/**/*',
      './node_modules/pdfjs-dist/**/*',
      './node_modules/@napi-rs/**/*',
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
