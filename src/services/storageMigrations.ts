import { STORAGE_KEYS, STORAGE_PREFIX, isObject } from './storage';

/**
 * 로컬 저장 구조 버전과 마이그레이션.
 *
 * 규칙 (업데이트 ≠ 초기화)
 * 1. 버전이 다르다고 데이터를 지우지 않는다. v1 → v2 → v3 순서로 "필요한 필드만" 바꾼다.
 * 2. 새 필드는 기존 값을 그대로 두고 빈 자리에만 기본값을 넣는다 (fillDefaults).
 * 3. 마이그레이션은 메모리 사본에서 먼저 끝까지 돌리고, 모두 성공했을 때만 저장한다.
 *    중간에 실패하면 원본을 하나도 바꾸지 않는다. 바꾼 키의 원본은 migration-backup에 남긴다.
 * 4. 저장된 버전이 앱보다 높으면(예전 앱으로 돌아간 경우) 아무것도 바꾸지 않는다.
 *
 * 새 마이그레이션 추가 방법: MIGRATIONS 끝에 { to: N+1, ... }를 더하고 CURRENT_STORAGE_VERSION을 올린다.
 */
export type RawData = Map<string, string>;

export interface Migration {
  to: number;
  description: string;
  /** data: 'offrou.' 키 → JSON 원문. 바꿀 키만 고친다. 오류를 던지면 전체가 취소된다. */
  run: (data: RawData) => void;
}

export const MIGRATIONS: Migration[] = [
  {
    to: 1,
    description: '저장 구조 버전 표시 시작 (데이터는 바꾸지 않는다)',
    run: () => {},
  },
];

export const CURRENT_STORAGE_VERSION = MIGRATIONS[MIGRATIONS.length - 1].to;

export interface StorageMeta {
  storageVersion: number;
  updatedAt: string;
  history: { from: number; to: number; at: string }[];
}

export interface MigrationResult {
  from: number;
  to: number;
  ok: boolean;
  changedKeys: string[];
  error?: string;
}

/* ─── 마이그레이션 작성 도우미 ─── */

/** JSON 값 하나를 고친다. 키가 없으면 아무것도 하지 않는다 (없는 데이터를 만들지 않음). */
export function editJson(data: RawData, key: string, edit: (value: unknown) => unknown) {
  const raw = data.get(key);
  if (raw === undefined) return;
  data.set(key, JSON.stringify(edit(JSON.parse(raw))));
}

/** 객체에 없는 필드만 기본값으로 채운다 — 기존 값은 절대 덮어쓰지 않는다 */
export function fillDefaults<T extends Record<string, unknown>>(value: unknown, defaults: T): unknown {
  if (!isObject(value)) return value;
  const out: Record<string, unknown> = { ...value };
  for (const [k, v] of Object.entries(defaults)) if (!(k in out)) out[k] = v;
  return out;
}

/* ─── 실행 ─── */

export function readStorageMeta(storage: Storage = localStorage): StorageMeta | null {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEYS.meta) ?? 'null');
    return isObject(parsed) && typeof parsed.storageVersion === 'number' ? (parsed as unknown as StorageMeta) : null;
  } catch {
    return null;
  }
}

const SKIP = new Set<string>([STORAGE_KEYS.meta, STORAGE_KEYS.recovery]);

export function runStorageMigrations({
  storage = localStorage,
  migrations = MIGRATIONS,
  target = CURRENT_STORAGE_VERSION,
  now = new Date(),
}: { storage?: Storage; migrations?: Migration[]; target?: number; now?: Date } = {}): MigrationResult {
  let meta: StorageMeta | null = null;
  try {
    meta = readStorageMeta(storage);
  } catch {
    meta = null;
  }
  const from = meta?.storageVersion ?? 0;
  if (from >= target) return { from, to: from, ok: true, changedKeys: [] };

  let original: RawData;
  try {
    original = new Map(
      Array.from({ length: storage.length }, (_, i) => storage.key(i))
        .filter((k): k is string => !!k && k.startsWith(STORAGE_PREFIX) && !SKIP.has(k) && !k.startsWith('offrou.migration-backup'))
        .map((k) => [k, storage.getItem(k)!]),
    );
  } catch (e) {
    return { from, to: from, ok: false, changedKeys: [], error: String(e) };
  }

  // 1) 메모리 사본에서 끝까지
  const working: RawData = new Map(original);
  try {
    for (const m of [...migrations].sort((a, b) => a.to - b.to)) {
      if (m.to <= from || m.to > target) continue;
      m.run(working);
    }
    for (const [k, v] of working) if (v !== original.get(k)) JSON.parse(v); // 결과가 올바른 JSON인지
  } catch (e) {
    // 원본은 하나도 바꾸지 않았다
    return { from, to: from, ok: false, changedKeys: [], error: e instanceof Error ? e.message : String(e) };
  }

  const changedKeys = [...working.keys()].filter((k) => working.get(k) !== original.get(k));

  // 2) 바뀌는 키의 원본을 먼저 보관 → 3) 저장 (중간에 실패하면 되돌린다)
  try {
    if (changedKeys.length) {
      const backup = Object.fromEntries(changedKeys.map((k) => [k, original.get(k) ?? null]));
      storage.setItem(`offrou.migration-backup.v${from}`, JSON.stringify({ savedAt: now.toISOString(), data: backup }));
    }
    for (const k of changedKeys) storage.setItem(k, working.get(k)!);
    const nextMeta: StorageMeta = {
      storageVersion: target,
      updatedAt: now.toISOString(),
      history: [...(meta?.history ?? []), { from, to: target, at: now.toISOString() }].slice(-20),
    };
    storage.setItem(STORAGE_KEYS.meta, JSON.stringify(nextMeta));
  } catch (e) {
    for (const k of changedKeys) {
      try {
        const v = original.get(k);
        if (v !== undefined) storage.setItem(k, v);
      } catch {
        // 무시
      }
    }
    return { from, to: from, ok: false, changedKeys: [], error: e instanceof Error ? e.message : String(e) };
  }

  return { from, to: target, ok: true, changedKeys };
}
