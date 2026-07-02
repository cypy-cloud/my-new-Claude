// FP AI Assistant Service Worker
// 보안 정책: 정적 리소스만 캐시 / 고객정보·PDF·API 응답 캐시 금지

const CACHE_NAME = 'fp-ai-static-v2'
const OFFLINE_URL = '/offline'

// 캐시할 정적 리소스 목록
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// 캐시 금지 경로 (보안상 민감한 데이터)
const NEVER_CACHE_PATTERNS = [
  /^\/api\//,          // 모든 API 응답
  /^\/auth\//,         // 인증 관련
  /\/pdf/i,            // PDF 파일
  /\/customers/,       // 고객 데이터
  /\/storage\//,       // Supabase Storage
  /supabase\.co/,      // Supabase 요청
  /anthropic/,         // AI API
]

function shouldNeverCache(url) {
  return NEVER_CACHE_PATTERNS.some(p => p.test(url))
}

// Install: 정적 리소스 사전 캐시
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // 일부 리소스 실패해도 설치 계속
      })
    }).then(() => self.skipWaiting())
  )
})

// Activate: 이전 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch: 캐시 전략
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // 보안: 절대로 캐시하지 않는 요청
  if (shouldNeverCache(request.url)) return

  // POST/PUT/PATCH/DELETE — 캐시 안 함
  if (request.method !== 'GET') return

  // chrome-extension 등 무시
  if (!url.protocol.startsWith('http')) return

  // 네비게이션 요청 (페이지 이동): Network first → offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches.match(OFFLINE_URL).then(r => r ?? new Response('오프라인 상태입니다', { status: 503 }))
        )
    )
    return
  }

  // 정적 리소스 (이미지, 폰트, manifest 등): Cache first → network
  const isStaticAsset =
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    /\.(png|jpg|jpeg|svg|ico|woff2?|ttf)$/.test(url.pathname)

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        }).catch(() => new Response('', { status: 404 }))
      })
    )
    return
  }

  // 그 외 — 네트워크 통과 (캐시 안 함)
})

// Push 알림 수신
self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon ?? '/icons/icon-192.png',
      badge: data.badge ?? '/icons/icon-192.png',
      data: { url: data.url ?? '/calendar' },
      vibrate: [200, 100, 200],
    })
  )
})

// 알림 클릭 시 캘린더 페이지로 이동
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/calendar'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})
