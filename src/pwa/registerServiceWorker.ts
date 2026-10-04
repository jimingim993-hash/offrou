import { markUpdateReady, setUpdateApplier } from './updates';

/**
 * 서비스 워커 등록 (프로덕션 빌드에서만).
 * 개발 중 캐시로 인한 혼란을 막기 위해 dev 모드에서는 등록하지 않는다.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => watchForUpdates(reg, navigator.serviceWorker, window))
      .catch((err) => {
        console.warn('[OFFROU] service worker registration failed', err);
      });
  });
}

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * 새 버전 감지 → "새로운 OFFROU가 준비됐어" 배너.
 * - 새 서비스 워커는 설치만 되고 기다린다. 사용자가 "업데이트"를 눌렀을 때만 넘어가고 한 번 새로고침한다.
 * - 처음 설치(이전 버전이 없을 때)에는 배너를 띄우지 않는다.
 * - 새로고침은 사용자가 요청한 경우에 딱 한 번만 → 업데이트 반복(루프)이 생기지 않는다.
 */
export function watchForUpdates(
  reg: ServiceWorkerRegistration,
  container: ServiceWorkerContainer,
  win: Pick<Window, 'location' | 'setInterval'> = window,
  doc: Pick<Document, 'addEventListener' | 'visibilityState'> = document,
) {
  let requested = false;
  let reloaded = false;

  const offer = (worker: ServiceWorker | null) => {
    // 이미 화면을 제어하는 버전이 있을 때만 "업데이트"다
    if (worker && container.controller) markUpdateReady();
  };

  setUpdateApplier(() => {
    const waiting = reg.waiting;
    if (!waiting) {
      // 이미 새 버전이 적용돼 있다면 화면만 새로 연다
      if (!reloaded) {
        reloaded = true;
        win.location.reload();
      }
      return;
    }
    requested = true;
    waiting.postMessage({ type: 'SKIP_WAITING' });
  });

  offer(reg.waiting);

  reg.addEventListener('updatefound', () => {
    const installing = reg.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed') offer(installing);
    });
  });

  container.addEventListener('controllerchange', () => {
    if (!requested || reloaded) return;
    reloaded = true;
    win.location.reload();
  });

  const check = () => {
    reg.update().catch(() => undefined);
  };
  win.setInterval(check, CHECK_INTERVAL_MS);
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'visible') check();
  });
}
