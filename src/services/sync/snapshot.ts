import type { ActivitySignals, FeedbackEntry, OffrouRecord } from '@/types/offrou';
import { getRecords, replaceRecords } from '../records';
import { getSavedRaw, replaceSaved, type SavedItem } from '../saved';
import { getFeedback, replaceFeedback } from '../feedback';
import { getActivity, replaceActivity } from '../activity';

/**
 * 계정과 동기화되는 사용자 데이터 묶음.
 * 공통 콘텐츠(경험·장면)는 포함하지 않는다 — 사용자마다 복제하지 않는다.
 */
export interface UserSnapshot {
  records: OffrouRecord[];
  /** 취소 기록(removedAt)까지 포함 */
  saved: SavedItem[];
  feedback: FeedbackEntry[];
  activity: ActivitySignals;
}

export const EMPTY_SNAPSHOT: UserSnapshot = {
  records: [],
  saved: [],
  feedback: [],
  activity: { recentShown: [], skipped: {}, started: {}, recentViewed: [] },
};

export const readLocalSnapshot = (): UserSnapshot => ({
  records: getRecords(),
  saved: getSavedRaw(),
  feedback: getFeedback(),
  activity: getActivity(),
});

export function writeLocalSnapshot(s: UserSnapshot) {
  replaceRecords(s.records);
  replaceSaved(s.saved);
  replaceFeedback(s.feedback);
  replaceActivity(s.activity);
}

/** 계정에 이어갈 만한 기록이 있는지 (완료·저장·피드백 기준) */
export const hasMeaningfulData = (s: UserSnapshot) =>
  s.records.length > 0 || s.saved.some((x) => !x.removedAt) || s.feedback.length > 0;

export const summarizeSnapshot = (s: UserSnapshot) => ({
  records: s.records.length,
  saved: s.saved.filter((x) => !x.removedAt).length,
});
