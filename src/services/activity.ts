import type { ActivitySignals } from '@/types/offrou';
import { STORAGE_KEYS, isObject, readJson, writeJson } from './storage';

/**
 * 추천에 쓰는 최소한의 사용 신호.
 * - recentShown: 최근 추천으로 보여준 경험 (최대 RECENT_LIMIT개)
 * - skipped: "다른 시간 보기"로 넘긴 횟수 (경험별)
 * - started: 시작한 횟수 (경험별). 이야기 속 선택 내용은 저장하지 않는다.
 * - recentViewed: 상세를 열어봤지만 아직 시작하지 않은 경험 (최대 RECENT_VIEW_LIMIT개)
 *
 * 이전 버전 데이터에 없는 필드는 빈 값으로 채워 읽는다 (기존 사용자 데이터 호환).
 */
export const RECENT_LIMIT = 8;
export const RECENT_VIEW_LIMIT = 5;

const EMPTY: ActivitySignals = { recentShown: [], skipped: {}, started: {}, recentViewed: [] };

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

const read = (): ActivitySignals => {
  const v = readJson<Partial<ActivitySignals>>(STORAGE_KEYS.activity, EMPTY, isObject);
  return {
    recentShown: strings(v.recentShown),
    skipped: isObject(v.skipped) ? (v.skipped as Record<string, number>) : {},
    started: isObject(v.started) ? (v.started as Record<string, number>) : {},
    recentViewed: strings(v.recentViewed).slice(0, RECENT_VIEW_LIMIT),
  };
};

export const getActivity = read;

/** 동기화용: 사용 신호 전체를 바꾼다 */
export const replaceActivity = (activity: ActivitySignals) => writeJson(STORAGE_KEYS.activity, activity);

export function noteShown(experienceId: string) {
  const a = read();
  const recentShown = [...a.recentShown.filter((id) => id !== experienceId), experienceId].slice(-RECENT_LIMIT);
  writeJson(STORAGE_KEYS.activity, { ...a, recentShown });
}

export function noteSkipped(experienceId: string) {
  const a = read();
  writeJson(STORAGE_KEYS.activity, { ...a, skipped: { ...a.skipped, [experienceId]: (a.skipped[experienceId] ?? 0) + 1 } });
}

/** 시작하면 '최근 본 시간'에서는 빠진다 (본 뒤 아직 시작하지 않은 것만 남긴다) */
export function noteStarted(experienceId: string) {
  const a = read();
  writeJson(STORAGE_KEYS.activity, {
    ...a,
    started: { ...a.started, [experienceId]: (a.started[experienceId] ?? 0) + 1 },
    recentViewed: a.recentViewed.filter((id) => id !== experienceId),
  });
}

/** 상세 화면을 열어본 경험. 최근 것이 앞, 최대 RECENT_VIEW_LIMIT개 */
export function noteViewed(experienceId: string) {
  const a = read();
  const recentViewed = [experienceId, ...a.recentViewed.filter((id) => id !== experienceId)].slice(0, RECENT_VIEW_LIMIT);
  writeJson(STORAGE_KEYS.activity, { ...a, recentViewed });
}

export const getRecentViewed = () => read().recentViewed;

/* 추천 세션: 같은 조건으로 "다른 시간 보기"를 누르는 동안 이미 보여준 경험. 탭을 닫으면 사라진다. */

interface Session {
  key: string;
  seen: string[];
}

const isSession = (v: unknown): v is Session => isObject(v) && typeof v.key === 'string' && Array.isArray(v.seen);

export function getSessionSeen(key: string): string[] {
  const s = readJson<Session | null>(STORAGE_KEYS.session, null, isSession, sessionStorage);
  return s?.key === key ? s.seen : [];
}

export function setSessionSeen(key: string, seen: string[]) {
  writeJson(STORAGE_KEYS.session, { key, seen } satisfies Session, sessionStorage);
}
