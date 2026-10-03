import type { ActivitySignals } from '@/types/offrou';
import { STORAGE_KEYS, isObject, readJson, writeJson } from './storage';

/**
 * 추천에 쓰는 최소한의 사용 신호.
 * - recentShown: 최근 추천으로 보여준 경험 (최대 RECENT_LIMIT개)
 * - skipped: "다른 시간 보기"로 넘긴 횟수 (경험별)
 * - started: 시작한 횟수 (경험별). 이야기 속 선택 내용은 저장하지 않는다.
 */
export const RECENT_LIMIT = 8;

const EMPTY: ActivitySignals = { recentShown: [], skipped: {}, started: {} };

const read = (): ActivitySignals => {
  const v = readJson<Partial<ActivitySignals>>(STORAGE_KEYS.activity, EMPTY, isObject);
  return {
    recentShown: Array.isArray(v.recentShown) ? v.recentShown.filter((x) => typeof x === 'string') : [],
    skipped: isObject(v.skipped) ? (v.skipped as Record<string, number>) : {},
    started: isObject(v.started) ? (v.started as Record<string, number>) : {},
  };
};

export const getActivity = read;

export function noteShown(experienceId: string) {
  const a = read();
  const recentShown = [...a.recentShown.filter((id) => id !== experienceId), experienceId].slice(-RECENT_LIMIT);
  writeJson(STORAGE_KEYS.activity, { ...a, recentShown });
}

export function noteSkipped(experienceId: string) {
  const a = read();
  writeJson(STORAGE_KEYS.activity, { ...a, skipped: { ...a.skipped, [experienceId]: (a.skipped[experienceId] ?? 0) + 1 } });
}

export function noteStarted(experienceId: string) {
  const a = read();
  writeJson(STORAGE_KEYS.activity, { ...a, started: { ...a.started, [experienceId]: (a.started[experienceId] ?? 0) + 1 } });
}

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
