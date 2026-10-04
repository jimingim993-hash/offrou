import type { CourseMinutes, CourseVibe } from '@/data/courses';
import { STORAGE_KEYS, isObject, readJson, writeJson } from './storage';

/**
 * 하던 OFFROU 이어하기 (16단계).
 * - 이야기(EXPERIENCE)와 작은 코스만 저장한다. 짧은 PLAY·REST·OUT은 저장하지 않는다.
 * - 각 종류마다 가장 최근 진행 하나만. 이 기기에만 저장한다 (동기화하지 않음).
 * - 정상 완료하면 그 진행 상태만 지운다 (MY 기록·다른 데이터는 그대로).
 * - 시작 당시 콘텐츠 버전을 함께 저장 → 버전이 바뀌었거나 장면이 사라졌으면 처음부터 안내.
 */
export interface StoryResume {
  experienceId: string;
  contentVersion: number;
  /** 지나온 장면 id (마지막이 현재 장면) */
  path: string[];
  flags: string[];
  startedAt: string;
  updatedAt: string;
}

export interface CourseResume {
  vibe: CourseVibe;
  minutes: CourseMinutes;
  stepIds: string[];
  /** 다음에 할 시간의 순서 (0부터) */
  step: number;
  runId: string;
  updatedAt: string;
}

interface ResumeState {
  story?: StoryResume;
  course?: CourseResume;
}

const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

const isStory = (v: unknown): v is StoryResume =>
  isObject(v) && typeof v.experienceId === 'string' && typeof v.contentVersion === 'number' && strings(v.path) && v.path.length > 0 && strings(v.flags);

const isCourse = (v: unknown): v is CourseResume =>
  isObject(v) && typeof v.vibe === 'string' && typeof v.minutes === 'number' && strings(v.stepIds) && typeof v.step === 'number' && typeof v.runId === 'string';

const read = (): ResumeState => {
  const raw = readJson<Record<string, unknown>>(STORAGE_KEYS.resume, {}, isObject);
  return { story: isStory(raw.story) ? raw.story : undefined, course: isCourse(raw.course) ? raw.course : undefined };
};

const write = (next: ResumeState) => writeJson(STORAGE_KEYS.resume, next);

export const getStoryResume = (experienceId?: string) => {
  const s = read().story;
  return s && (!experienceId || s.experienceId === experienceId) ? s : undefined;
};

export function saveStoryResume(entry: Omit<StoryResume, 'updatedAt' | 'startedAt'> & { startedAt?: string }, now = new Date()) {
  const prev = read();
  const same = prev.story?.experienceId === entry.experienceId ? prev.story : undefined;
  write({ ...prev, story: { ...entry, startedAt: entry.startedAt ?? same?.startedAt ?? now.toISOString(), updatedAt: now.toISOString() } });
}

export function clearStoryResume(experienceId?: string) {
  const prev = read();
  if (!prev.story || (experienceId && prev.story.experienceId !== experienceId)) return;
  write({ ...prev, story: undefined });
}

export const getCourseResume = () => read().course;

export function saveCourseResume(entry: Omit<CourseResume, 'updatedAt'>, now = new Date()) {
  write({ ...read(), course: { ...entry, updatedAt: now.toISOString() } });
}

export function clearCourseResume(runId?: string) {
  const prev = read();
  if (!prev.course || (runId && prev.course.runId !== runId)) return;
  write({ ...prev, course: undefined });
}

/** HOME 카드에 보여줄 가장 최근 진행 하나 */
export function latestResume(): { kind: 'story'; story: StoryResume } | { kind: 'course'; course: CourseResume } | undefined {
  const { story, course } = read();
  if (story && (!course || story.updatedAt >= course.updatedAt)) return { kind: 'story', story };
  if (course) return { kind: 'course', course };
  return undefined;
}
