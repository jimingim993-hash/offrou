import { STORAGE_KEYS, isObject, readList, writeJson } from './storage';

/**
 * "나중에 해보고 싶은" 저장한 시간.
 * 저장을 취소하면 지우지 않고 removedAt을 남긴다(tombstone) → 다른 기기와 병합할 때 취소가 되살아나지 않는다.
 * 4·5단계 데이터(removedAt 없음)는 그대로 '저장됨'으로 읽힌다.
 */
export interface SavedItem {
  experienceId: string;
  savedAt: string;
  /** 저장 취소 시각. 있으면 저장되지 않은 상태 */
  removedAt?: string;
}

const isItem = (v: unknown): v is SavedItem =>
  isObject(v) &&
  typeof v.experienceId === 'string' &&
  typeof v.savedAt === 'string' &&
  (v.removedAt === undefined || typeof v.removedAt === 'string');

/** 취소 기록까지 포함한 전체 (동기화용) */
export const getSavedRaw = (): SavedItem[] =>
  readList(STORAGE_KEYS.saved, isItem);

export const replaceSaved = (items: SavedItem[]) => writeJson(STORAGE_KEYS.saved, items);

const active = () => getSavedRaw().filter((s) => !s.removedAt);

/** 지금 저장된 것만, 최신 저장이 먼저 */
export const getSaved = (): SavedItem[] => active().sort((a, b) => b.savedAt.localeCompare(a.savedAt));

export const isSaved = (experienceId: string) => active().some((s) => s.experienceId === experienceId);

/** 저장/취소를 바꾸고, 바뀐 뒤의 저장 여부를 돌려준다 */
export function toggleSaved(experienceId: string, now = new Date()): boolean {
  const at = now.toISOString();
  const list = getSavedRaw();
  const current = list.find((s) => s.experienceId === experienceId);
  const nowSaved = !current || !!current.removedAt;
  const next: SavedItem = nowSaved ? { experienceId, savedAt: at } : { ...current!, removedAt: at };
  writeJson(STORAGE_KEYS.saved, [...list.filter((s) => s.experienceId !== experienceId), next]);
  return nowSaved;
}
