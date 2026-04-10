const CACHE_NAME = 'ippp-v2'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // http/https 요청만 처리 (chrome-error:// 등 특수 URL 제외)
  if (!event.request.url.startsWith('http')) return

  const url = new URL(event.request.url)

  // 페이지 네비게이션(HTML) 요청은 브라우저에 위임 — chrome-error:// 충돌 방지
  if (event.request.mode === 'navigate') return

  // API 요청 및 Supabase 요청은 캐시하지 않음
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    event.request.method !== 'GET'
  ) {
    return
  }

  // 정적 자산: 캐시 우선
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response
        // _next/static 자산만 추가 캐싱
        if (url.pathname.startsWith('/_next/static/')) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
