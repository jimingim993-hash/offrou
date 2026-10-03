import { listExperiences } from './experiences';
import type {
  CategoryId,
  DurationOption,
  Experience,
  MoodId,
  RecommendMode,
  UserHistory,
} from '@/types/offrou';

/**
 * 오늘의 OFFROU 추천 엔진 (순수 함수, AI/외부 API 없음).
 *
 * 1순위  상태 + 시간 조건 (findCandidates) — 반드시 지킨다.
 * 2순위  좋았어를 남긴 카테고리에 약한 가중치.
 * 3순위  최근 추천·완료한 경험은 우선 제외 (부족하면 단계적으로 풀어준다).
 * 4순위  아직 해보지 않은 경험에 약한 가중치.
 * + 일정 비율(exploreRate)로 적게 경험한 카테고리를 우선하는 "탐색" 추천.
 * + fresh 모드: 취향 가중치 대신 새로움을 우선 ("평소와 조금 다른 걸 해볼래?").
 *
 * 카테고리를 먼저 고르고 그 안에서 경험을 고른다 → 한 카테고리만 계속 나오지 않는다.
 * UI는 이 모듈의 결과만 쓰므로, 이후 추천 방식을 바꿔도 화면은 그대로 둔다.
 */

export const EMPTY_HISTORY: UserHistory = {
  records: [],
  feedback: [],
  activity: { recentShown: [], skipped: {}, started: {} },
};

/** 탐색 추천 비율 */
export const EXPLORE_RATE = 0.2;
/** 최근 완료 중 우선 제외할 개수 */
const RECENT_DONE_LIMIT = 5;

export function findCandidates(
  mood: MoodId,
  duration: DurationOption,
  pool: Experience[] = listExperiences(),
): Experience[] {
  return pool.filter(
    (e) =>
      (mood === 'anything' || (e.moods as MoodId[]).includes(mood)) &&
      (duration.minutes === null || e.minutes <= duration.minutes),
  );
}

/**
 * 추천 후보. fresh 모드에서는 상태 조건을 넓혀 다른 종류의 시간도 제안한다
 * (시간 조건은 유지, '자기 전에'는 차분한 경험만 유지).
 */
export function candidatesFor(
  mood: MoodId,
  duration: DurationOption,
  mode: RecommendMode = 'usual',
  pool: Experience[] = listExperiences(),
): Experience[] {
  return findCandidates(mode === 'fresh' && mood !== 'bedtime' ? 'anything' : mood, duration, pool);
}

/* ─── 기록 요약 ─── */

const inc = <K>(map: Map<K, number>, key: K, by = 1) => map.set(key, (map.get(key) ?? 0) + by);

export function summarize(history: UserHistory) {
  const completed = new Map<string, number>();
  const categoryDone = new Map<CategoryId, number>();
  const good = new Map<CategoryId, number>();
  const meh = new Map<CategoryId, number>();
  const expGood = new Set<string>();
  const expMeh = new Set<string>();

  for (const r of history.records) {
    inc(completed, r.experienceId);
    inc(categoryDone, r.categoryId);
  }
  for (const f of history.feedback) {
    if (f.value === 'good') {
      inc(good, f.categoryId);
      expGood.add(f.experienceId);
    } else {
      inc(meh, f.categoryId);
      expMeh.add(f.experienceId);
    }
  }
  const recentDone = [...history.records]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, RECENT_DONE_LIMIT)
    .map((r) => r.experienceId);

  return { completed, categoryDone, good, meh, expGood, expMeh, recentDone };
}

type Summary = ReturnType<typeof summarize>;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** 2순위: 좋았던 카테고리는 조금 더, 별로였던 카테고리는 조금 덜 (최대 2배) */
const affinity = (s: Summary, c: CategoryId) =>
  clamp(1 + 0.5 * (s.good.get(c) ?? 0) - 0.3 * (s.meh.get(c) ?? 0) + 0.05 * (s.categoryDone.get(c) ?? 0), 0.6, 2);

/** 새로움: 적게 경험한 카테고리일수록 크다 */
const novelty = (s: Summary, c: CategoryId) => 1 / (1 + 0.5 * (s.categoryDone.get(c) ?? 0));

function itemWeight(e: Experience, s: Summary, history: UserHistory, fresh: boolean) {
  const done = s.completed.get(e.id) ?? 0;
  let w = 1;
  if (fresh) {
    w *= done ? 0.3 : 2.5;
  } else {
    if (!done) w *= 1.3; // 4순위: 아직 해보지 않은 경험
    if (s.expGood.has(e.id)) w *= 1.2;
    if (s.expMeh.has(e.id)) w *= 0.5;
  }
  w *= Math.max(0.4, 0.8 ** (history.activity.skipped[e.id] ?? 0)); // 자주 넘긴 경험은 조금 덜
  if ((history.activity.started[e.id] ?? 0) > done) w *= 0.85; // 시작만 하고 끝내지 않은 경험
  return w;
}

function weightedPick<T>(items: T[], weight: (t: T) => number, random: () => number): T {
  const weights = items.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

/* ─── 추천 ─── */

export interface RecommendInput {
  mood: MoodId;
  duration: DurationOption;
  /** 경험 콘텐츠 목록 (기본: 전체) */
  experiences?: Experience[];
  /** 사용자 기록·피드백·최근 추천 (기본: 신규 사용자) */
  history?: UserHistory;
  mode?: RecommendMode;
  /** 바로 직전에 보여준 경험 */
  excludeId?: string | null;
  /** 이번 추천 세션에서 이미 보여준 경험 */
  seenIds?: string[];
  random?: () => number;
  exploreRate?: number;
}

export interface Recommendation {
  experience: Experience;
  /** 화면에 보여줄 짧은 이유 */
  reason: string;
  /** 세션 후보를 모두 보여줘서 처음부터 다시 도는 중 */
  cycled: boolean;
  /** 조건에 맞는 전체 후보 수 */
  candidateCount: number;
}

export function recommendExperience({
  mood,
  duration,
  experiences = listExperiences(),
  history = EMPTY_HISTORY,
  mode = 'usual',
  excludeId,
  seenIds = [],
  random = Math.random,
  exploreRate = EXPLORE_RATE,
}: RecommendInput): Recommendation | undefined {
  const candidates = candidatesFor(mood, duration, mode, experiences);
  if (candidates.length === 0) return undefined;

  const s = summarize(history);
  const seen = new Set(seenIds);
  const recent = new Set([...history.activity.recentShown, ...s.recentDone]);

  // 3순위 + fallback: 조건을 하나씩 풀어서라도 반드시 하나는 고른다
  const tiers: ((e: Experience) => boolean)[] = [
    (e) => e.id !== excludeId && !seen.has(e.id) && !recent.has(e.id),
    (e) => e.id !== excludeId && !seen.has(e.id),
    (e) => e.id !== excludeId,
    () => true,
  ];
  let tier = 0;
  let pool: Experience[] = [];
  for (; tier < tiers.length; tier++) {
    pool = candidates.filter(tiers[tier]);
    if (pool.length) break;
  }

  const fresh = mode === 'fresh';
  const explore = !fresh && history.records.length > 0 && random() < exploreRate;

  const byCategory = new Map<CategoryId, Experience[]>();
  for (const e of pool) byCategory.set(e.categoryId, [...(byCategory.get(e.categoryId) ?? []), e]);

  // 같은 카테고리만 연달아 보여줬다면 그 카테고리는 잠시 덜
  const lastCats = history.activity.recentShown
    .slice(-3)
    .map((id) => experiences.find((e) => e.id === id)?.categoryId);
  const tired =
    lastCats.length === 3 && lastCats.every((c) => c && c === lastCats[0]) && byCategory.size > 1 ? lastCats[0] : undefined;

  const categoryWeight = ([c, items]: [CategoryId, Experience[]]) => {
    const mean = items.reduce((sum, e) => sum + itemWeight(e, s, history, fresh), 0) / items.length;
    const factor = fresh || explore ? novelty(s, c) : affinity(s, c);
    return mean * factor * (c === tired ? 0.5 : 1);
  };

  const [, group] = weightedPick([...byCategory.entries()], categoryWeight, random);
  const experience = weightedPick(group, (e) => itemWeight(e, s, history, fresh), random);

  return {
    experience,
    reason: explainRecommendation(experience, { duration, mode, history }),
    cycled: tier >= 2 && seen.size > 0,
    candidateCount: candidates.length,
  };
}

/** 2단계 호환: 조건 + 직전 제외만으로 하나를 고른다 */
export function recommend({
  mood,
  duration,
  excludeId,
  pool,
  random,
}: {
  mood: MoodId;
  duration: DurationOption;
  excludeId?: string | null;
  pool?: Experience[];
  random?: () => number;
}): Experience | undefined {
  return recommendExperience({ mood, duration, excludeId, experiences: pool, random, exploreRate: 0 })?.experience;
}

/* ─── 추천 이유 ─── */

const CATEGORY_REASONS: Record<CategoryId, string> = {
  rest: '요즘 쉬는 시간을 자주 찾았네.',
  play: '요즘 가볍게 노는 시간이 잘 맞았지.',
  hobby: '요즘 뭔가 해보는 시간이 좋았지.',
  experience: '요즘 다른 하루 속으로 자주 다녀왔네.',
  out: '요즘 밖에서 보낸 시간이 좋았지.',
};

/**
 * 짧고 자연스러운 추천 이유. "분석" 같은 말은 쓰지 않는다.
 * 새로고침해도 같은 문구가 나오도록 난수 없이 계산한다.
 */
export function explainRecommendation(
  experience: Experience,
  { duration, mode = 'usual', history = EMPTY_HISTORY }: { duration: DurationOption; mode?: RecommendMode; history?: UserHistory },
): string {
  if (mode === 'fresh') return '평소와 조금 다른 시간이야.';
  const s = summarize(history);
  if (history.records.length > 0 && !s.completed.has(experience.id)) return '아직 해보지 않은 시간이야.';
  const c = experience.categoryId;
  if ((s.categoryDone.get(c) ?? 0) >= 3 || (s.good.get(c) ?? 0) >= 2) return CATEGORY_REASONS[c];
  return duration.minutes === null ? '오늘은 시간 걱정 없이.' : `지금 ${duration.label}이면 충분해.`;
}
