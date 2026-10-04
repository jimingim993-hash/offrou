import type { ActivitySignals, CategoryId, DurationId, FeedbackEntry, InteractionType, MoodId, OffrouRecord } from '@/types/offrou';
import type { SavedItem } from '../saved';
import type { CourseRun, SavedCourse } from '../courses';
import type { CourseMinutes, CourseVibe } from '@/data/courses';
import type { PushPayload } from '../sync/merge';
import { EMPTY_SNAPSHOT, type UserSnapshot } from '../sync/snapshot';

/**
 * 앱 데이터 ↔ Supabase 테이블 행 변환 (순수 함수).
 * 테이블 정의: supabase/migrations/*_offrou_user_data.sql
 * user_id는 로그인한 사용자 id로만 채운다. 서버 RLS가 auth.uid()와 같은지 다시 확인한다.
 */

export interface CompletionRow {
  user_id: string;
  id: string;
  experience_id: string;
  title: string;
  category_id: CategoryId;
  minutes: number;
  completed_at: string;
  mood_id: MoodId | null;
  duration_id: DurationId | null;
  kind: InteractionType | null;
  ending_title: string | null;
  course_run_id: string | null;
}

export interface SavedRow {
  user_id: string;
  experience_id: string;
  saved_at: string;
  removed_at: string | null;
}

export interface FeedbackRow {
  user_id: string;
  record_id: string;
  experience_id: string;
  category_id: CategoryId;
  value: 'good' | 'meh';
  at: string;
}

export interface TasteRow {
  user_id: string;
  data: ActivitySignals;
  updated_at: string;
}

export const TABLES = {
  completions: 'offrou_completions',
  saved: 'offrou_saved',
  feedback: 'offrou_feedback',
  taste: 'offrou_taste',
  courseRuns: 'offrou_course_runs',
  savedCourses: 'offrou_saved_courses',
} as const;

export interface CourseRunRow {
  user_id: string;
  id: string;
  course_id: string;
  title: string;
  vibe: CourseVibe;
  target_minutes: CourseMinutes;
  step_ids: string[];
  completed_ids: string[];
  started_at: string;
  updated_at: string;
  ended_at: string | null;
}

export interface SavedCourseRow {
  user_id: string;
  id: string;
  title: string;
  vibe: CourseVibe;
  target_minutes: CourseMinutes;
  step_ids: string[];
  saved_at: string;
  removed_at: string | null;
}

const clip = (s: string, max: number) => s.slice(0, max);

export const toCompletionRow = (userId: string, r: OffrouRecord): CompletionRow => ({
  user_id: userId,
  id: clip(r.id, 64),
  experience_id: clip(r.experienceId, 64),
  title: clip(r.title, 100),
  category_id: r.categoryId,
  minutes: r.minutes,
  completed_at: r.completedAt,
  mood_id: r.moodId ?? null,
  duration_id: r.durationId ?? null,
  kind: r.kind ?? null,
  ending_title: r.endingTitle ? clip(r.endingTitle, 100) : null,
  course_run_id: r.courseRunId ? clip(r.courseRunId, 64) : null,
});

export const fromCompletionRow = (row: CompletionRow): OffrouRecord => ({
  id: row.id,
  experienceId: row.experience_id,
  title: row.title,
  categoryId: row.category_id,
  minutes: row.minutes,
  completedAt: new Date(row.completed_at).toISOString(),
  ...(row.mood_id && { moodId: row.mood_id }),
  ...(row.duration_id && { durationId: row.duration_id }),
  ...(row.kind && { kind: row.kind }),
  ...(row.ending_title && { endingTitle: row.ending_title }),
  ...(row.course_run_id && { courseRunId: row.course_run_id }),
});

export const toSavedRow = (userId: string, s: SavedItem): SavedRow => ({
  user_id: userId,
  experience_id: clip(s.experienceId, 64),
  saved_at: s.savedAt,
  removed_at: s.removedAt ?? null,
});

export const fromSavedRow = (row: SavedRow): SavedItem => ({
  experienceId: row.experience_id,
  savedAt: new Date(row.saved_at).toISOString(),
  ...(row.removed_at && { removedAt: new Date(row.removed_at).toISOString() }),
});

export const toFeedbackRow = (userId: string, f: FeedbackEntry): FeedbackRow => ({
  user_id: userId,
  record_id: clip(f.recordId, 64),
  experience_id: clip(f.experienceId, 64),
  category_id: f.categoryId,
  value: f.value,
  at: f.at,
});

export const fromFeedbackRow = (row: FeedbackRow): FeedbackEntry => ({
  recordId: row.record_id,
  experienceId: row.experience_id,
  categoryId: row.category_id,
  value: row.value,
  at: new Date(row.at).toISOString(),
});

const iso = (s: string) => new Date(s).toISOString();

export const toCourseRunRow = (userId: string, r: CourseRun): CourseRunRow => ({
  user_id: userId,
  id: clip(r.id, 64),
  course_id: clip(r.courseId, 64),
  title: clip(r.title, 100),
  vibe: r.vibe,
  target_minutes: r.targetMinutes,
  step_ids: r.stepIds.slice(0, 6).map((s) => clip(s, 64)),
  completed_ids: r.completedIds.slice(0, 6).map((s) => clip(s, 64)),
  started_at: r.startedAt,
  updated_at: r.updatedAt,
  ended_at: r.endedAt ?? null,
});

export const fromCourseRunRow = (row: CourseRunRow): CourseRun => ({
  id: row.id,
  courseId: row.course_id,
  title: row.title,
  vibe: row.vibe,
  targetMinutes: row.target_minutes,
  stepIds: row.step_ids,
  completedIds: row.completed_ids,
  startedAt: iso(row.started_at),
  updatedAt: iso(row.updated_at),
  ...(row.ended_at && { endedAt: iso(row.ended_at) }),
});

export const toSavedCourseRow = (userId: string, c: SavedCourse): SavedCourseRow => ({
  user_id: userId,
  id: clip(c.id, 64),
  title: clip(c.title, 100),
  vibe: c.vibe,
  target_minutes: c.targetMinutes,
  step_ids: c.stepIds.slice(0, 6).map((s) => clip(s, 64)),
  saved_at: c.savedAt,
  removed_at: c.removedAt ?? null,
});

export const fromSavedCourseRow = (row: SavedCourseRow): SavedCourse => ({
  id: row.id,
  title: row.title,
  vibe: row.vibe,
  targetMinutes: row.target_minutes,
  stepIds: row.step_ids,
  savedAt: iso(row.saved_at),
  ...(row.removed_at && { removedAt: iso(row.removed_at) }),
});

export function rowsToSnapshot(rows: {
  completions: CompletionRow[];
  saved: SavedRow[];
  feedback: FeedbackRow[];
  taste: TasteRow | null;
  courseRuns?: CourseRunRow[];
  savedCourses?: SavedCourseRow[];
}): UserSnapshot {
  return {
    records: rows.completions.map(fromCompletionRow),
    saved: rows.saved.map(fromSavedRow),
    feedback: rows.feedback.map(fromFeedbackRow),
    activity: { ...EMPTY_SNAPSHOT.activity, ...(rows.taste?.data ?? {}) },
    courseRuns: (rows.courseRuns ?? []).map(fromCourseRunRow),
    savedCourses: (rows.savedCourses ?? []).map(fromSavedCourseRow),
  };
}

export function pushToRows(userId: string, changes: PushPayload, now = new Date()) {
  return {
    completions: changes.records.map((r) => toCompletionRow(userId, r)),
    saved: changes.saved.map((s) => toSavedRow(userId, s)),
    feedback: changes.feedback.map((f) => toFeedbackRow(userId, f)),
    taste: changes.activity ? ({ user_id: userId, data: changes.activity, updated_at: now.toISOString() } satisfies TasteRow) : null,
    courseRuns: changes.courseRuns.map((r) => toCourseRunRow(userId, r)),
    savedCourses: changes.savedCourses.map((c) => toSavedCourseRow(userId, c)),
  };
}
