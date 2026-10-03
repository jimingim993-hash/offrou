/**
 * 서비스 워커 등록 (프로덕션 빌드에서만).
 * 개발 중 캐시로 인한 혼란을 막기 위해 dev 모드에서는 등록하지 않는다.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[OFFROU] service worker registration failed', err);
    });
  });
}
