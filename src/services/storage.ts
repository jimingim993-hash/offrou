/**
 * OFFROU 로컬 저장소 공통 레이어.
 * - 모든 키는 'offrou.' 접두사를 쓴다 → 사용자가 직접 고른 초기화 때만 한 번에 지운다.
 * - 쓰기가 일어나면 구독자에게 알린다 → 화면이 다시 읽는다 (useStoreVersion).
 * - 개인정보(이름·연락처·위치 등)는 저장하지 않는다. 서비스 사용 기록만 둔다.
 *
 * 데이터 보존 원칙 (업데이트 ≠ 초기화)
 * - 읽다가 깨진 값을 만나도 빈 값으로 덮어쓰지 않는다: 원본을 recovery에 먼저 보관한다.
 * - 목록 중 일부 항목만 이상하면 그 항목만 빼고 쓰되, 빠진 항목도 recovery에 보관한다.
 * - 저장 구조가 바뀔 때는 storageMigrations.ts의 단계별 마이그레이션으로만 바꾼다.
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
  /** 이전 보관본들 (새 보관본이 생겨도 덮어쓰지 않고 여기로 옮긴다) */
  guestBackupArchive: 'offrou.guest-backup-archive.v1',
  /** 작은 코스 진행 기록 */
  courseRuns: 'offrou.course-runs.v1',
  /** 저장한 코스 */
  savedCourses: 'offrou.saved-courses.v1',
  /** 오늘의 OFFROU (날짜별 하나, 이 기기에만) */
  daily: 'offrou.daily.v1',
  /** "새로운 시간" 알림 설정 (켬/끔·시간·빈도, 이 기기에만) */
  notify: 'offrou.notify.v1',
  /** 저장 구조 버전 (storageMigrations.ts) */
  meta: 'offrou.meta.v1',
  /** 읽지 못한(깨진·알 수 없는) 원본 보관함 — 자동으로 지우지 않는다 */
  recovery: 'offrou.recovery.v1',
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

/* ─── 복구 보관함 ─── */

export interface RecoveryEntry {
  key: string;
  /** 원본 그대로 (문자열) */
  raw: string;
  reason: 'unreadable' | 'invalid' | 'invalid-item';
  at: string;
}

const RECOVERY_LIMIT = 100;

export function getRecovery(storage: Storage = localStorage): RecoveryEntry[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEYS.recovery) ?? '[]');
    return Array.isArray(parsed) ? (parsed as RecoveryEntry[]) : [];
  } catch {
    return [];
  }
}

/** 원본을 보관함에 남긴다 (같은 원본은 한 번만). 보관함 자체가 실패해도 앱은 계속된다. */
export function preserveRaw(key: string, raw: string, reason: RecoveryEntry['reason'], storage: Storage = localStorage) {
  if (key === STORAGE_KEYS.recovery || storage !== localStorage) return;
  try {
    const list = getRecovery(storage);
    if (list.some((e) => e.key === key && e.raw === raw)) return;
    const next = [...list, { key, raw, reason, at: new Date().toISOString() }].slice(-RECOVERY_LIMIT);
    storage.setItem(STORAGE_KEYS.recovery, JSON.stringify(next));
  } catch {
    // 저장 공간이 없으면 보관은 못 하지만, 원본도 건드리지 않았다
  }
}

export function readJson<T>(key: string, fallback: T, isValid: (v: unknown) => boolean, storage: Storage = localStorage): T {
  let raw: string | null = null;
  try {
    raw = storage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (isValid(parsed)) return parsed as T;
    preserveRaw(key, raw, 'invalid', storage);
    return fallback;
  } catch {
    // JSON이 깨졌어도 원본을 먼저 보관 → 다음 저장이 덮어써도 사라지지 않는다
    if (raw !== null) preserveRaw(key, raw, 'unreadable', storage);
    return fallback;
  }
}

/** 목록 읽기: 이상한 항목만 빼고 돌려주되, 뺀 항목은 보관함에 남긴다 (나머지 기록은 그대로) */
export function readList<T>(key: string, isItem: (v: unknown) => v is T, storage: Storage = localStorage): T[] {
  const list = readJson<unknown[]>(key, [], Array.isArray, storage);
  const ok: T[] = [];
  for (const item of list) {
    if (isItem(item)) ok.push(item);
    else preserveRaw(key, JSON.stringify(item), 'invalid-item', storage);
  }
  return ok;
}

export function writeJson(key: string, value: unknown, storage: Storage = localStorage) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 조용히 넘어간다.
  }
  emit();
}

/** 사용자가 직접 초기화해도 남기는 키 (저장 구조 버전) */
const ALWAYS_KEEP: string[] = [STORAGE_KEYS.meta];

/**
 * 이 기기에 남은 OFFROU 데이터를 지운다 → 처음 방문한 상태로.
 * ⚠️ 사용자가 직접 "기록 초기화"·"로그아웃하며 지우기"를 고른 경우에만 부른다. 업데이트·오류 처리에서 쓰지 않는다.
 * 서버(계정) 데이터는 건드리지 않는다. keep에 든 키는 남긴다 (예: 계정 연결 정보).
 */
export function resetAllData({ keep = [] }: { keep?: string[] } = {}) {
  const kept = [...keep, ...ALWAYS_KEEP];
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(
        (k): k is string => !!k && k.startsWith(STORAGE_PREFIX) && !kept.includes(k),
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
