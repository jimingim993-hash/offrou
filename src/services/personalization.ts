import { CATEGORIES } from '@/data/categories';
import type { CategoryId, DurationOption, Experience, MoodId, RecommendMode, UserHistory } from '@/types/offrou';
import { getRecords } from './records';
import { getFeedback } from './feedback';
import { getActivity, getSessionSeen, noteShown, setSessionSeen } from './activity';
import {
  dayKey,
  explainInstant,
  explainRecommendation,
  pickDaily,
  recommendExperience,
  recommendInstant,
  type Recommendation,
} from './recommendation';
import { generateCourse, type Course } from './course';
import { getExperience } from './experiences';
import { STORAGE_KEYS, isObject, readJson, writeJson } from './storage';
import type { CourseMinutes, CourseVibe } from '@/data/courses';

/**
 * 화면과 추천 엔진 사이의 연결 계층.
 * 이 기기에 저장된 사용 기록을 모아 엔진에 넘기고, MY 화면용 요약을 계산한다.
 */
export function getUserHistory(): UserHistory {
  return { records: getRecords(), feedback: getFeedback(), activity: getActivity() };
}

const sessionKey = (mood: MoodId, duration: DurationOption, mode: RecommendMode) => `${mood}|${duration.id}|${mode}`;

interface NextInput {
  mood: MoodId;
  duration: DurationOption;
  mode: RecommendMode;
  excludeId?: string;
}

/** 다음 추천 하나. 이번 세션에서 보여준 경험을 기억해 후보를 한 바퀴 돈 뒤에만 다시 순환한다. */
export function getNextRecommendation({ mood, duration, mode, excludeId }: NextInput): Recommendation | undefined {
  const key = sessionKey(mood, duration, mode);
  const seen = getSessionSeen(key);
  const rec = recommendExperience({ mood, duration, mode, excludeId, seenIds: seen, history: getUserHistory() });
  if (rec) {
    setSessionSeen(key, rec.cycled ? [rec.experience.id] : [...seen, rec.experience.id]);
    noteShown(rec.experience.id);
  }
  return rec;
}

export const getReason = (experience: Experience, duration: DurationOption, mode: RecommendMode) =>
  explainRecommendation(experience, { duration, mode, history: getUserHistory() });

/* ─── 지금 딱 하나 ─── */

const INSTANT_SESSION = 'instant';

/** 아무것도 고르지 않고 바로 하나. 이번 세션에서 보여준 건 한 바퀴 돌기 전엔 다시 나오지 않는다. */
export function getNextInstant(excludeId?: string): Recommendation | undefined {
  const seen = getSessionSeen(INSTANT_SESSION);
  const rec = recommendInstant({ excludeId, seenIds: seen, history: getUserHistory() });
  if (rec) {
    setSessionSeen(INSTANT_SESSION, rec.cycled ? [rec.experience.id] : [...seen, rec.experience.id]);
    noteShown(rec.experience.id);
  }
  return rec;
}

export const getInstantReason = (experience: Experience) => explainInstant(experience, getUserHistory());

/* ─── 오늘의 OFFROU ─── */

interface DailyPick {
  date: string;
  experienceId: string;
}

const isDaily = (v: unknown): v is DailyPick => isObject(v) && typeof v.date === 'string' && typeof v.experienceId === 'string';

/**
 * 오늘의 OFFROU. 날짜로 정해지고, 처음 정한 결과를 그날 동안 그대로 보여준다
 * (오늘 이미 해봤어도 바뀌지 않는다). 다음 날엔 어제와 다른 것으로 바뀐다. 출석·보상 같은 건 없다.
 */
export function getTodayOffrou(now = new Date()): Experience | undefined {
  const today = dayKey(now);
  const stored = readJson<DailyPick | null>(STORAGE_KEYS.daily, null, isDaily);
  if (stored?.date === today) {
    const kept = getExperience(stored.experienceId);
    if (kept) return kept;
  }
  const picked = pickDaily({ date: now, history: getUserHistory(), previousId: stored?.experienceId });
  if (picked) writeJson(STORAGE_KEYS.daily, { date: today, experienceId: picked.id } satisfies DailyPick);
  return picked;
}

/* ─── 작은 OFFROU 코스 ─── */

export const makeCourse = (minutes: CourseMinutes, vibe: CourseVibe, avoidIds: string[] = []): Course | undefined =>
  generateCourse({ minutes, vibe, avoidIds, history: getUserHistory() });

/* ─── MY 요약 ─── */

/** 취향을 보여주기 위한 최소 기록 수 */
export const MIN_RECORDS_FOR_TASTE = 3;
const TASTE_WINDOW = 20;

export interface MyOverview {
  monthCount: number;
  /** 이번 달 카테고리별 횟수 (많은 순, 0 제외) */
  monthByCategory: { categoryId: CategoryId; count: number }[];
  /** 요즘 자주 보낸 시간. 기록이 부족하면 빈 배열 → 단정하지 않는다 */
  frequent: CategoryId[];
}

export function getMyOverview(now = new Date(), records = getRecords()): MyOverview {
  const thisMonth = records.filter((r) => {
    const d = new Date(r.completedAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const count = (list: typeof records) => {
    const m = new Map<CategoryId, number>();
    for (const r of list) m.set(r.categoryId, (m.get(r.categoryId) ?? 0) + 1);
    // 같은 횟수면 카테고리 기본 순서
    return CATEGORIES.map((c) => ({ categoryId: c.id, count: m.get(c.id) ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  };

  const recent = records.slice(0, TASTE_WINDOW);
  const frequent =
    recent.length >= MIN_RECORDS_FOR_TASTE
      ? count(recent)
          .filter((x) => x.count >= 2)
          .slice(0, 2)
          .map((x) => x.categoryId)
      : [];

  return { monthCount: thisMonth.length, monthByCategory: count(thisMonth), frequent };
}
