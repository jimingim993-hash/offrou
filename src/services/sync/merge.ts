import type { ActivitySignals, FeedbackEntry, OffrouRecord } from '@/types/offrou';
import { RECENT_LIMIT, RECENT_VIEW_LIMIT } from '../activity';
import type { SavedItem } from '../saved';
import type { UserSnapshot } from './snapshot';

/**
 * 두 기기(또는 기기와 서버)의 기록을 합친다. 순수 함수.
 * 원칙: 지우기보다 합치기. 완료 기록은 절대 사라지지 않는다.
 *
 * - 완료 기록: 합집합. 같은 id, 또는 같은 경험을 같은 시각에 완료한 기록은 하나로.
 * - 저장: 경험별로 마지막에 일어난 일(저장 또는 취소)이 이긴다.
 * - 피드백: 완료 기록별로 마지막에 남긴 값이 이긴다.
 * - 사용 신호: 횟수는 큰 값, 최근 목록은 이 기기(a) 것을 앞세워 합친다.
 */
export function mergeSnapshots(a: UserSnapshot, b: UserSnapshot): UserSnapshot {
  return {
    records: mergeRecords(a.records, b.records),
    saved: mergeSaved(a.saved, b.saved),
    feedback: mergeFeedback(a.feedback, b.feedback),
    activity: mergeActivity(a.activity, b.activity),
  };
}

const recordKey = (r: OffrouRecord) => `${r.experienceId}|${r.completedAt}`;

export function mergeRecords(a: OffrouRecord[], b: OffrouRecord[]): OffrouRecord[] {
  const byId = new Map<string, OffrouRecord>();
  for (const r of [...a, ...b]) {
    const prev = byId.get(r.id);
    // 같은 기록이면 정보가 더 많은 쪽(결말 등)을 남긴다
    byId.set(r.id, prev ? { ...r, ...prev, endingTitle: prev.endingTitle ?? r.endingTitle } : r);
  }
  // id는 다르지만 같은 경험·같은 시각 → 같은 완료로 본다 (작은 id를 남겨 결과가 항상 같게)
  const byKey = new Map<string, OffrouRecord>();
  for (const r of [...byId.values()].sort((x, y) => x.id.localeCompare(y.id))) {
    if (!byKey.has(recordKey(r))) byKey.set(recordKey(r), r);
  }
  return [...byKey.values()].sort((x, y) => y.completedAt.localeCompare(x.completedAt));
}

const lastEvent = (s: SavedItem) => (s.removedAt && s.removedAt > s.savedAt ? s.removedAt : s.savedAt);

export function mergeSaved(a: SavedItem[], b: SavedItem[]): SavedItem[] {
  const map = new Map<string, SavedItem>();
  for (const s of [...a, ...b]) {
    const prev = map.get(s.experienceId);
    if (!prev || lastEvent(s) > lastEvent(prev)) map.set(s.experienceId, s);
  }
  return [...map.values()];
}

export function mergeFeedback(a: FeedbackEntry[], b: FeedbackEntry[]): FeedbackEntry[] {
  const map = new Map<string, FeedbackEntry>();
  for (const f of [...a, ...b]) {
    const prev = map.get(f.recordId);
    if (!prev || f.at > prev.at) map.set(f.recordId, f);
  }
  return [...map.values()];
}

const maxCounts = (x: Record<string, number>, y: Record<string, number>) => {
  const out: Record<string, number> = { ...y };
  for (const [k, v] of Object.entries(x)) out[k] = Math.max(v, out[k] ?? 0);
  return out;
};

export function mergeActivity(a: ActivitySignals, b: ActivitySignals): ActivitySignals {
  return {
    // 오래된 것 → 최근 순서. 이 기기(a)의 최근 추천이 가장 뒤(최근)에 오도록
    recentShown: [...b.recentShown.filter((id) => !a.recentShown.includes(id)), ...a.recentShown].slice(-RECENT_LIMIT),
    skipped: maxCounts(a.skipped, b.skipped),
    started: maxCounts(a.started, b.started),
    // 최근 것이 앞
    recentViewed: [...a.recentViewed, ...b.recentViewed.filter((id) => !a.recentViewed.includes(id))].slice(
      0,
      RECENT_VIEW_LIMIT,
    ),
  };
}

/** 서버에 올려야 할 것만 (서버 상태 대비 새로 생기거나 바뀐 것) */
export function diffForPush(merged: UserSnapshot, server: UserSnapshot) {
  const serverRecords = new Set(server.records.map((r) => r.id));
  const serverSaved = new Map(server.saved.map((s) => [s.experienceId, s]));
  const serverFeedback = new Map(server.feedback.map((f) => [f.recordId, f]));
  return {
    records: merged.records.filter((r) => !serverRecords.has(r.id)),
    saved: merged.saved.filter((s) => {
      const prev = serverSaved.get(s.experienceId);
      return !prev || prev.savedAt !== s.savedAt || prev.removedAt !== s.removedAt;
    }),
    feedback: merged.feedback.filter((f) => {
      const prev = serverFeedback.get(f.recordId);
      return !prev || prev.value !== f.value || prev.at !== f.at;
    }),
    activity: JSON.stringify(merged.activity) === JSON.stringify(server.activity) ? undefined : merged.activity,
  };
}

export type PushPayload = ReturnType<typeof diffForPush>;

export const isEmptyPush = (p: PushPayload) =>
  !p.records.length && !p.saved.length && !p.feedback.length && !p.activity;
