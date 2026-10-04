import type { NotifyFrequency, PushStore, PushSubscriptionInput } from '@/services/account/types';
import { STORAGE_KEYS, isObject, readJson, writeJson } from '@/services/storage';
import { isIos, isStandalone } from './install';

/**
 * "새로운 시간" 알림 (선택 기능, 기본 꺼짐).
 * - 알림 권한은 사용자가 MY에서 직접 버튼을 눌렀을 때만 요청한다 (첫 방문·가입·설치 때 묻지 않음).
 * - 사용자가 시간을 고르기 전에는 아무것도 예약하지 않는다.
 * - 로그인한 사용자만 받을 수 있다 (구독을 계정에 묶어 서버가 정한 시간에 보낸다).
 * - 기기가 지원하지 않으면 그렇다고 말한다 (거짓 성공 없음).
 */
type Win = Window & typeof globalThis;

export type NotifyCapability = 'supported' | 'ios-needs-install' | 'unsupported';
export type NotifyPermission = 'default' | 'granted' | 'denied';

export interface NotifySettings {
  enabled: boolean;
  /** 'HH:MM'. 사용자가 고르기 전에는 null */
  time: string | null;
  frequency: NotifyFrequency;
  /** 서버에 저장된 이 기기의 구독 주소 (끌 때 지우기 위해) */
  endpoint?: string;
  updatedAt?: string;
}

export const DEFAULT_NOTIFY: NotifySettings = { enabled: false, time: null, frequency: 'daily' };

export const TIME_PRESETS = [
  { time: '08:00', label: '아침 8:00' },
  { time: '12:30', label: '점심 12:30' },
  { time: '19:00', label: '저녁 7:00' },
  { time: '21:30', label: '밤 9:30' },
] as const;

export const FREQUENCIES: { id: NotifyFrequency; label: string; hint: string }[] = [
  { id: 'daily', label: '매일', hint: '하루에 한 번' },
  { id: 'sometimes', label: '가끔', hint: '일주일에 두 번쯤' },
];

/** 서비스 워커·서버가 쓰는 부드러운 문구. 재촉·비교·죄책감을 주는 말은 쓰지 않는다. */
export const GENTLE_MESSAGES = [
  '잠깐 다른 시간으로 가볼래?',
  '오늘 이런 시간은 어때?',
  '10분 정도 다른 걸 해볼까?',
  '오늘 하루에 작은 틈 하나 만들어볼래?',
] as const;

export const isValidTime = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

const isSettings = (v: unknown) =>
  isObject(v) &&
  typeof v.enabled === 'boolean' &&
  (v.time === null || isValidTime(v.time)) &&
  (v.frequency === 'daily' || v.frequency === 'sometimes');

export const getNotifySettings = (): NotifySettings => readJson(STORAGE_KEYS.notify, DEFAULT_NOTIFY, isSettings);

export const saveNotifySettings = (next: NotifySettings) =>
  writeJson(STORAGE_KEYS.notify, { ...next, updatedAt: new Date().toISOString() });

/** '19:00' → '저녁 7:00' */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const part = h < 5 ? '새벽' : h < 11 ? '아침' : h < 14 ? '점심' : h < 18 ? '오후' : h < 21 ? '저녁' : '밤';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${part} ${h12}:${String(m).padStart(2, '0')}`;
}

export function getNotifyCapability(win: Win = window): NotifyCapability {
  const supported =
    'Notification' in win && 'serviceWorker' in win.navigator && 'PushManager' in win && typeof win.Notification === 'function';
  if (supported) return 'supported';
  // iPhone·iPad는 홈 화면에 추가한 앱에서만 웹 알림을 쓸 수 있다 (iOS 16.4 이상)
  if (isIos(win.navigator) && !isStandalone(win)) return 'ios-needs-install';
  return 'unsupported';
}

export function getNotifyPermission(win: Win = window): NotifyPermission {
  try {
    const p = win.Notification?.permission;
    return p === 'granted' || p === 'denied' ? p : 'default';
  } catch {
    return 'default';
  }
}

/** ⚠️ 사용자의 클릭 처리 안에서만 부른다 */
export async function requestNotifyPermission(win: Win = window): Promise<NotifyPermission> {
  try {
    const result = await win.Notification.requestPermission();
    return result === 'granted' || result === 'denied' ? result : 'default';
  } catch {
    return getNotifyPermission(win);
  }
}

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export const deviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';
  } catch {
    return 'Asia/Seoul';
  }
};

const READY_TIMEOUT_MS = 8000;

async function readyRegistration(nav: Navigator): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('sw-not-ready')), READY_TIMEOUT_MS));
  return Promise.race([nav.serviceWorker.ready, timeout]);
}

export type EnableResult =
  | { ok: true; settings: NotifySettings }
  | { ok: false; reason: 'denied' | 'dismissed' | 'unsupported' | 'failed' };

/**
 * 알림 켜기: 권한 요청 → 브라우저 구독 → 서버 저장 → 이 기기 설정 저장.
 * 서버 저장까지 끝나야 "켜짐"으로 표시한다. 중간에 실패하면 만든 구독을 되돌린다.
 */
export async function enableNotifications(opts: {
  time: string;
  frequency: NotifyFrequency;
  vapidPublicKey: string;
  store: PushStore;
  win?: Win;
}): Promise<EnableResult> {
  const win = opts.win ?? window;
  if (!isValidTime(opts.time)) return { ok: false, reason: 'failed' };
  if (getNotifyCapability(win) !== 'supported') return { ok: false, reason: 'unsupported' };

  let permission = getNotifyPermission(win);
  if (permission === 'default') permission = await requestNotifyPermission(win);
  if (permission === 'denied') return { ok: false, reason: 'denied' };
  if (permission !== 'granted') return { ok: false, reason: 'dismissed' };

  let subscription: PushSubscription | null = null;
  let created = false;
  try {
    const reg = await readyRegistration(win.navigator);
    subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(opts.vapidPublicKey),
      });
      created = true;
    }
    const json = subscription.toJSON();
    const input: PushSubscriptionInput = {
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      time: opts.time,
      frequency: opts.frequency,
      timezone: deviceTimezone(),
    };
    if (!input.endpoint || !input.p256dh || !input.auth) throw new Error('incomplete-subscription');
    await opts.store.save(input);
    const settings: NotifySettings = { enabled: true, time: opts.time, frequency: opts.frequency, endpoint: input.endpoint };
    saveNotifySettings(settings);
    return { ok: true, settings };
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[OFFROU notify]', e);
    if (created) await subscription?.unsubscribe().catch(() => false);
    return { ok: false, reason: 'failed' };
  }
}

/**
 * 알림 끄기. 이 기기 설정은 바로 끄고, 브라우저 구독과 서버 구독은 할 수 있는 만큼 지운다.
 * (서버에서 못 지운 구독은 브라우저 구독이 사라졌으므로 다음 발송 때 서버가 정리한다)
 */
export async function disableNotifications(opts: { store?: PushStore | null; win?: Window } = {}) {
  const win = opts.win ?? window;
  const current = getNotifySettings();
  saveNotifySettings({ ...current, enabled: false, endpoint: undefined });
  let endpoint = current.endpoint;
  try {
    if ('serviceWorker' in win.navigator) {
      const reg = await win.navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        endpoint ??= sub.endpoint;
        await sub.unsubscribe();
      }
    }
  } catch {
    // 무시
  }
  if (endpoint && opts.store) await opts.store.remove(endpoint).catch(() => undefined);
}
