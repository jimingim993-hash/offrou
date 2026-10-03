import { STORAGE_KEYS, isObject, readJson, writeJson } from './storage';

/** "나중에 해보고 싶은" 저장한 시간. 최신 저장이 먼저. */
export interface SavedItem {
  experienceId: string;
  savedAt: string;
}

const isItem = (v: unknown): v is SavedItem =>
  isObject(v) && typeof v.experienceId === 'string' && typeof v.savedAt === 'string';

const read = (): SavedItem[] => readJson<unknown[]>(STORAGE_KEYS.saved, [], Array.isArray).filter(isItem);

export const getSaved = (): SavedItem[] => [...read()].sort((a, b) => b.savedAt.localeCompare(a.savedAt));

export const isSaved = (experienceId: string) => read().some((s) => s.experienceId === experienceId);

/** 저장/취소를 바꾸고, 바뀐 뒤의 저장 여부를 돌려준다 */
export function toggleSaved(experienceId: string, now = new Date()): boolean {
  const list = read();
  const next = list.some((s) => s.experienceId === experienceId)
    ? list.filter((s) => s.experienceId !== experienceId)
    : [...list, { experienceId, savedAt: now.toISOString() }];
  writeJson(STORAGE_KEYS.saved, next);
  return next.some((s) => s.experienceId === experienceId);
}
