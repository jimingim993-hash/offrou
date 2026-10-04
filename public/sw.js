/*
 * OFFROU Service Worker
 * - 앱 셸(HTML)은 network-first, 정적 자산은 cache-first.
 * - 7단계: 공식 홈페이지('/')와 서비스('/app')가 같은 index.html을 쓴다 → 오프라인에서도 두 경로 모두 앱 셸로 열린다.
 * - 오프라인 고도화/푸시 등은 이후 단계에서 확장한다.
 */
const CACHE_VERSION = 'offrou-v2';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 페이지 이동: 네트워크 우선, 실패 시 캐시된 앱 셸로 (SPA 라우팅 대응)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // 정적 자산: 캐시 우선
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
