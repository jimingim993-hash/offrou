import { STORAGE_KEYS, isObject, readList, writeJson } from './storage';
import { getExperience } from './experiences';
import type { Experience } from '@/types/offrou';

/**
 * 최근 본 OFFROU (16단계). 상세·실행 화면을 실제로 연 경우만 남긴다 (추천 카드가 보였다는 이유로는 남기지 않음).
 * id와 본 시각만 저장하고, 제목·카테고리·시간은 지금 콘텐츠 데이터에서 가져온다.
 */
export interface RecentEntry {
  id: string;
  viewedAt: string;
}

export const RECENT_LIMIT = 20;

const isEntry = (v: unknown): v is RecentEntry => isObject(v) && typeof v.id === 'string' && typeof v.viewedAt === 'string';

export const getRecentRaw = () => readList(STORAGE_KEYS.recentViewed, isEntry);

export function noteRecent(id: string, now = new Date()) {
  const list = getRecentRaw().filter((e) => e.id !== id);
  writeJson(STORAGE_KEYS.recentViewed, [{ id, viewedAt: now.toISOString() }, ...list].slice(0, RECENT_LIMIT));
}

/** MY에 보여줄 목록 — 최근 순, 지금 이용할 수 없는 콘텐츠는 자연스럽게 빠진다 (저장된 값은 지우지 않음) */
export function getRecentExperiences(): { experience: Experience; viewedAt: string }[] {
  return getRecentRaw()
    .sort((a, b) => b.viewedAt.localeCompare(a.viewedAt))
    .map((e) => ({ experience: getExperience(e.id), viewedAt: e.viewedAt }))
    .filter((x): x is { experience: Experience; viewedAt: string } => x.experience !== undefined);
}
