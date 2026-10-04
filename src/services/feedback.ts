import type { CategoryId, FeedbackEntry, FeedbackValue, OffrouRecord } from '@/types/offrou';
import { STORAGE_KEYS, isObject, readJson, writeJson } from './storage';

/**
 * 완료 후 가벼운 피드백 ("좋았어" / "그냥 그랬어").
 * 완료 기록 하나에 피드백 하나. 다시 누르면 바뀐다. 남기지 않아도 된다.
 */
type FeedbackMap = Record<string, FeedbackEntry>;

const isEntry = (v: unknown): v is FeedbackEntry =>
  isObject(v) && typeof v.experienceId === 'string' && (v.value === 'good' || v.value === 'meh');

const read = (): FeedbackMap => {
  const map = readJson<Record<string, unknown>>(STORAGE_KEYS.feedback, {}, isObject);
  return Object.fromEntries(Object.entries(map).filter(([, v]) => isEntry(v))) as FeedbackMap;
};

export function setFeedback(
  record: Pick<OffrouRecord, 'id' | 'experienceId' | 'categoryId'>,
  value: FeedbackValue,
  now = new Date(),
) {
  const entry: FeedbackEntry = {
    recordId: record.id,
    experienceId: record.experienceId,
    categoryId: record.categoryId as CategoryId,
    value,
    at: now.toISOString(),
  };
  writeJson(STORAGE_KEYS.feedback, { ...read(), [record.id]: entry });
}

export const getFeedbackFor = (recordId: string): FeedbackValue | undefined => read()[recordId]?.value;

export const getFeedback = (): FeedbackEntry[] => Object.values(read());

/** 동기화용: 피드백 전체를 바꾼다 */
export const replaceFeedback = (entries: FeedbackEntry[]) =>
  writeJson(STORAGE_KEYS.feedback, Object.fromEntries(entries.map((e) => [e.recordId, e])));
