/**
 * OFFROU 로컬 저장소 공통 레이어.
 * - 모든 키는 'offrou.' 접두사를 쓴다 → 초기화 시 한 번에 지운다.
 * - 쓰기가 일어나면 구독자에게 알린다 → 화면이 다시 읽는다 (useStoreVersion).
 * - 개인정보(이름·연락처·위치 등)는 저장하지 않는다. 서비스 사용 기록만 둔다.
 */
export const STORAGE_PREFIX = 'offrou.';

export const STORAGE_KEYS = {
  records: 'offrou.records.v1',
  feedback: 'offrou.feedback.v1',
  saved: 'offrou.saved.v1',
  activity: 'offrou.activity.v1',
  /** 이 기기의 기록이 연결된 계정 (비회원이면 없음) */
  account: 'offrou.account.v1',
  /** '새로 시작하기'를 고를 때 따로 보관해 둔 비회원 기록 (자동 삭제하지 않는다) */
  guestBackup: 'offrou.guest-backup.v1',
  /** sessionStorage: 지금 추천 세션에서 이미 보여준 경험 */
  session: 'offrou.session.v1',
} as const;

let version = 0;
const listeners = new Set<() => void>();

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getVersion = () => version;

const emit = () => {
  version++;
  for (const l of listeners) l();
};

export function readJson<T>(key: string, fallback: T, isValid: (v: unknown) => boolean, storage: Storage = localStorage): T {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown, storage: Storage = localStorage) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 조용히 넘어간다.
  }
  emit();
}

/**
 * 이 기기에 남은 OFFROU 데이터를 지운다 → 처음 방문한 상태로.
 * 서버(계정) 데이터는 건드리지 않는다. keep에 든 키는 남긴다 (예: 계정 연결 정보).
 */
export function resetAllData({ keep = [] }: { keep?: string[] } = {}) {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(
        (k): k is string => !!k && k.startsWith(STORAGE_PREFIX) && !keep.includes(k),
      );
      for (const k of keys) storage.removeItem(k);
    } catch {
      // 무시
    }
  }
  emit();
}

export const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
