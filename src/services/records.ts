import type { DurationId, Experience, MoodId, OffrouRecord } from '@/types/offrou';
import { STORAGE_KEYS, readList, writeJson } from './storage';
import { getContentVersion } from './experiences';

/**
 * MY OFFROU 기록 저장소.
 * 지금은 회원가입 없이 이 기기의 localStorage에만 저장한다.
 * 이후 선택적 계정이 생기면 이 모듈에서 서버 동기화를 붙인다.
 */
const isRecord = (v: unknown): v is OffrouRecord =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as OffrouRecord).id === 'string' &&
  typeof (v as OffrouRecord).experienceId === 'string' &&
  typeof (v as OffrouRecord).title === 'string' &&
  typeof (v as OffrouRecord).completedAt === 'string';

const read = (): OffrouRecord[] =>
  readList(STORAGE_KEYS.records, isRecord);

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** 동기화용: 기록 전체를 바꾼다 (병합 결과 반영) */
export const replaceRecords = (records: OffrouRecord[]) => writeJson(STORAGE_KEYS.records, records);

/** 이 경험을 완료한 적이 있는지 (다시 경험하기 표시용) */
export const hasRecord = (experienceId: string) => read().some((r) => r.experienceId === experienceId);

/** 최신 기록이 먼저 오도록 반환 */
export function getRecords(): OffrouRecord[] {
  return read().sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

interface AddRecordContext {
  moodId?: MoodId;
  durationId?: DurationId;
  /** 이야기 경험의 결말 제목 */
  endingTitle?: string;
  courseRunId?: string;
  now?: Date;
}

export function addRecord(experience: Experience, { moodId, durationId, endingTitle, courseRunId, now = new Date() }: AddRecordContext = {}) {
  const record: OffrouRecord = {
    id: createId(),
    experienceId: experience.id,
    title: experience.title,
    categoryId: experience.categoryId,
    minutes: experience.minutes,
    completedAt: now.toISOString(),
    kind: experience.interaction?.type ?? 'guide',
    ...(moodId && { moodId }),
    ...(durationId && { durationId }),
    ...(endingTitle && { endingTitle }),
    ...(courseRunId && { courseRunId }),
    contentVersion: getContentVersion(experience),
  };
  writeJson(STORAGE_KEYS.records, [...read(), record]);
  return record;
}
