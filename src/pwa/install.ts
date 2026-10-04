import { useSyncExternalStore } from 'react';

/**
 * 홈 화면 설치 상태.
 * - Android/Chrome 계열: 브라우저가 beforeinstallprompt를 줄 때만 "설치하기" 버튼을 보여준다.
 *   (이벤트는 앱이 그려지기 전에 올 수 있어 main.tsx에서 바로 잡아둔다)
 * - iPhone·iPad Safari: 설치 버튼이 없으므로 "공유 → 홈 화면에 추가" 안내만 보여준다.
 * - 이미 앱으로 열려 있으면 "OFFROU 앱으로 사용 중".
 * - 그 밖의 환경: 아무것도 보여주지 않는다 (가짜 설치 버튼 없음).
 * 설치를 강요하는 팝업은 띄우지 않는다.
 */
export type InstallState = 'installed' | 'available' | 'ios-safari' | 'ios-other' | 'unsupported';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false;
let captured = false;
let snapshot: InstallState | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  snapshot = null;
  for (const l of listeners) l();
};

export function isStandalone(win: Window = window): boolean {
  try {
    if (win.matchMedia?.('(display-mode: standalone)').matches) return true;
    if (win.matchMedia?.('(display-mode: fullscreen)').matches) return true;
  } catch {
    // 무시
  }
  return (win.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPhone·iPad 여부 (iPadOS는 Mac처럼 보이므로 터치 지원으로 구분) */
export function isIos(nav: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> = navigator): boolean {
  const ua = nav.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (nav.maxTouchPoints ?? 0) > 1);
}

/** iOS에서 홈 화면 추가를 안내할 수 있는 Safari인지 (Chrome·Firefox·Edge·앱 내 브라우저 제외) */
export function isIosSafari(nav: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> = navigator): boolean {
  const ua = nav.userAgent;
  if (!isIos(nav)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|YaBrowser|DuckDuckGo|GSA\//i.test(ua)) return false;
  // 카카오톡·인스타그램 등 앱 안의 브라우저
  if (/KAKAOTALK|Instagram|FBAN|FBAV|Line\/|NAVER\(/i.test(ua)) return false;
  return /Safari\//i.test(ua);
}

export function computeInstallState(win: Window = window): InstallState {
  if (installedNow || isStandalone(win)) return 'installed';
  if (deferred) return 'available';
  if (isIos(win.navigator)) return isIosSafari(win.navigator) ? 'ios-safari' : 'ios-other';
  return 'unsupported';
}

export function captureInstallPrompt(win: Window = window) {
  if (captured) return;
  captured = true;
  win.addEventListener('beforeinstallprompt', (e) => {
    // 브라우저의 자동 안내 대신, 사용자가 MY에서 직접 누를 때만 띄운다
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  win.addEventListener('appinstalled', () => {
    deferred = null;
    installedNow = true;
    emit();
  });
}

/** 설치 대화상자 열기. 결과: 설치함 / 닫음 / 띄울 수 없음 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const ev = deferred;
  if (!ev) return 'unavailable';
  // 한 번 쓴 이벤트는 다시 쓸 수 없다
  deferred = null;
  try {
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    if (outcome === 'accepted') installedNow = true;
    return outcome;
  } catch {
    return 'unavailable';
  } finally {
    emit();
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  let mq: MediaQueryList | undefined;
  try {
    mq = window.matchMedia?.('(display-mode: standalone)');
    mq?.addEventListener?.('change', emit);
  } catch {
    mq = undefined;
  }
  return () => {
    listeners.delete(l);
    mq?.removeEventListener?.('change', emit);
  };
};

const getSnapshot = () => (snapshot ??= computeInstallState());

export const useInstallState = () => useSyncExternalStore(subscribe, getSnapshot, () => 'unsupported' as InstallState);

export function resetInstallForTesting() {
  deferred = null;
  installedNow = false;
  captured = false;
  emit();
}
