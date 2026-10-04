import type { CourseMinutes, CourseVibe } from '@/data/courses';
import { STORAGE_KEYS, isObject, readJson, writeJson } from './storage';
import type { Course } from './course';

/**
 * 코스 진행 기록과 저장한 코스 (이 기기에 먼저 저장, 로그인 중이면 동기화).
 * 개별 경험 기록(records)은 그대로 남고 courseRunId로 이 진행에 묶인다 → MY에서 코스 하나로 보여준다.
 */
export interface CourseRun {
  id: string;
  courseId: string;
  title: string;
  vibe: CourseVibe;
  targetMinutes: CourseMinutes;
  stepIds: string[];
  /** 이 진행에서 마친 경험 (순서대로) */
  completedIds: string[];
  startedAt: string;
  updatedAt: string;
  /** 끝낸 시각 (끝까지 했거나 "여기까지만 할래") */
  endedAt?: string;
}

export interface SavedCourse {
  id: string;
  title: string;
  vibe: CourseVibe;
  targetMinutes: CourseMinutes;
  stepIds: string[];
  savedAt: string;
  /** 저장 취소 시각 (다른 기기와 병합할 때 되살아나지 않게) */
  removedAt?: string;
}

const strings = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');

const isRun = (v: unknown): v is CourseRun =>
  isObject(v) &&
  typeof v.id === 'string' &&
  typeof v.courseId === 'string' &&
  typeof v.title === 'string' &&
  strings(v.stepIds) &&
  strings(v.completedIds) &&
  typeof v.startedAt === 'string';

const isSavedCourse = (v: unknown): v is SavedCourse =>
  isObject(v) && typeof v.id === 'string' && typeof v.title === 'string' && strings(v.stepIds) && typeof v.savedAt === 'string';

/* ─── 진행 기록 ─── */

export const getCourseRunsRaw = (): CourseRun[] => readJson<unknown[]>(STORAGE_KEYS.courseRuns, [], Array.isArray).filter(isRun);

export const replaceCourseRuns = (runs: CourseRun[]) => writeJson(STORAGE_KEYS.courseRuns, runs);

export const getCourseRun = (id: string | null | undefined) => getCourseRunsRaw().find((r) => r.id === id);

export const newRunId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `run-${crypto.randomUUID()}`
    : `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function upsertRun(runId: string, course: Course, update: (run: CourseRun) => CourseRun, now: Date) {
  const runs = getCourseRunsRaw();
  const at = now.toISOString();
  const current =
    runs.find((r) => r.id === runId) ??
    ({
      id: runId,
      courseId: course.id,
      title: course.title,
      vibe: course.vibe,
      targetMinutes: course.targetMinutes,
      stepIds: course.stepIds,
      completedIds: [],
      startedAt: at,
      updatedAt: at,
    } satisfies CourseRun);
  replaceCourseRuns([...runs.filter((r) => r.id !== runId), { ...update(current), updatedAt: at }]);
}

/** 코스 안의 경험 하나를 마쳤을 때 */
export function recordCourseStep(runId: string, course: Course, experienceId: string, now = new Date()) {
  upsertRun(
    runId,
    course,
    (run) => (run.completedIds.includes(experienceId) ? run : { ...run, completedIds: [...run.completedIds, experienceId] }),
    now,
  );
}

/** 코스를 끝냈을 때 (끝까지 했거나 여기까지만). 마친 경험이 없으면 기록을 남기지 않는다. */
export function endCourseRun(runId: string, course: Course, now = new Date()) {
  const run = getCourseRun(runId);
  if (!run || run.completedIds.length === 0 || run.endedAt) return;
  upsertRun(runId, course, (r) => ({ ...r, endedAt: now.toISOString() }), now);
}

/* ─── 저장한 코스 ─── */

export const getSavedCoursesRaw = (): SavedCourse[] =>
  readJson<unknown[]>(STORAGE_KEYS.savedCourses, [], Array.isArray).filter(isSavedCourse);

export const replaceSavedCourses = (items: SavedCourse[]) => writeJson(STORAGE_KEYS.savedCourses, items);

export const getSavedCourses = () =>
  getSavedCoursesRaw()
    .filter((c) => !c.removedAt)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));

export const isCourseSaved = (id: string) => getSavedCourses().some((c) => c.id === id);

/** 저장/취소를 바꾸고 바뀐 뒤의 저장 여부를 돌려준다 */
export function toggleSavedCourse(course: Course, now = new Date()): boolean {
  const at = now.toISOString();
  const list = getSavedCoursesRaw();
  const current = list.find((c) => c.id === course.id);
  const nowSaved = !current || !!current.removedAt;
  const next: SavedCourse = nowSaved
    ? { id: course.id, title: course.title, vibe: course.vibe, targetMinutes: course.targetMinutes, stepIds: course.stepIds, savedAt: at }
    : { ...current!, removedAt: at };
  replaceSavedCourses([...list.filter((c) => c.id !== course.id), next]);
  return nowSaved;
}
