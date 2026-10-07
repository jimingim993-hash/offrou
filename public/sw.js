/*
 * OFFROU Service Worker
 *
 * - 설치 때 앱 전체(HTML·JS·CSS·아이콘)를 미리 저장한다 → 한 번 연 뒤에는 네트워크가 없어도 열린다.
 *   (BUILD.files는 빌드 때 실제 파일 목록으로 채워진다 — vite.config.ts / pwa-build.ts)
 * - 페이지 이동: 네트워크 우선(짧은 제한 시간) → 실패하면 저장된 앱 셸. '/'와 '/app'이 같은 앱 셸을 쓴다.
 * - 정적 자산: 저장본 우선. 서버 데이터(Supabase 등 다른 출처)는 건드리지 않는다.
 * - 업데이트: 새 버전은 설치만 해두고 기다린다. 사용자가 "업데이트"를 누르면(SKIP_WAITING) 그때 바뀐다.
 * - 푸시: 부드러운 "새로운 시간" 알림을 보여주고, 누르면 OFFROU(/app)를 연다.
 */
const BUILD = /* OFFROU_BUILD */ { version: 'dev', files: [] } /* /OFFROU_BUILD */;

const CACHE = `offrou-${BUILD.version}`;
const FONT_CACHE = 'offrou-fonts';
const SHELL = '/index.html';
const CORE = [
  SHELL,
  '/manifest.webmanifest',
  '/icons/favicon-48.png',
  '/brand/offrou-symbol.png',
  '/brand/offrou-logo-dark.png',
  '/brand/offrou-logo-light.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/robots.txt',
];
const NAVIGATION_TIMEOUT_MS = 3500;
const FONT_HOST = 'cdn.jsdelivr.net';

const GENTLE_MESSAGES = [
  '잠깐 다른 시간으로 가볼래?',
  '오늘 이런 시간은 어때?',
  '10분 정도 다른 걸 해볼까?',
  '오늘 하루에 작은 틈 하나 만들어볼래?',
];

self.addEventListener('install', (event) => {
  // 새 버전은 미리 받아두기만 하고 바로 바꾸지 않는다 (진행 중인 경험을 끊지 않게)
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([...new Set([...CORE, ...BUILD.files])])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('offrou-') && k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });

async function handleNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(request), NAVIGATION_TIMEOUT_MS);
    if (response.ok) cache.put(SHELL, response.clone());
    return response;
  } catch {
    const shell = await cache.match(SHELL);
    return (
      shell ||
      new Response('<!doctype html><meta charset="utf-8"><title>OFFROU</title><p>연결되면 OFFROU가 다시 열려.</p>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

const isStaticPath = (path) =>
  path.startsWith('/assets/') || path.startsWith('/icons/') || path.startsWith('/brand/') || path === '/manifest.webmanifest';

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(handleNavigation(request));
      return;
    }
    if (isStaticPath(url.pathname)) event.respondWith(cacheFirst(request, CACHE));
    return;
  }

  // 글꼴(외부 CDN)만 저장해 둔다. 서버 데이터 요청은 그대로 통과시킨다.
  if (url.hostname === FONT_HOST) event.respondWith(cacheFirst(request, FONT_CACHE));
});

/* ─── 푸시 알림 ─── */

/** 알림이 열 주소는 OFFROU 서비스(/app…) 안으로만. 이상한 값이면 HOME. */
function safeAppUrl(raw) {
  try {
    const url = new URL(raw || '/app', self.location.origin);
    if (url.origin === self.location.origin && (url.pathname === '/app' || url.pathname.startsWith('/app/'))) {
      return url.pathname + url.search;
    }
  } catch {
    // 무시
  }
  return '/app';
}

function readPush(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    return {};
  }
}

self.addEventListener('push', (event) => {
  const data = readPush(event);
  const body =
    typeof data.body === 'string' && data.body
      ? data.body
      : GENTLE_MESSAGES[Math.floor(Math.random() * GENTLE_MESSAGES.length)];
  event.waitUntil(
    self.registration.showNotification(typeof data.title === 'string' && data.title ? data.title : 'OFFROU', {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'offrou-new-time',
      data: { url: safeAppUrl(data.url) },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = safeAppUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        if ('navigate' in existing) {
          try {
            await existing.navigate(target);
            return;
          } catch {
            // 이동이 막힌 경우 새 창으로
          }
        }
      }
      await self.clients.openWindow(target);
    }),
  );
});
