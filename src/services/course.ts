import { COURSE_TITLES, findVibe, type CourseMinutes, type CourseVibe } from '@/data/courses';
import type { Experience, UserHistory } from '@/types/offrou';
import { getExperience, listExperiences } from './experiences';
import { EMPTY_HISTORY, hashString, itemWeight, summarize, weightedPick } from './recommendation';

/**
 * 작은 OFFROU 코스 생성 (순수 함수, AI 없음).
 * 기존 경험 2~4개를 이어 붙여 고른 시간에 가까운 하나의 흐름을 만든다.
 *
 * 시간 규칙: 총합은 고른 시간의 60%~120% 안에서만 (20분 → 12~24분, 30분 → 18~36분, 60분 → 36~72분).
 * 한 경험이 코스를 독차지하지 않도록 경험 하나는 고른 시간의 60% 이하만 쓴다.
 * 분위기: 중심 카테고리 + 부드럽게 섞을 카테고리 최대 1개 (data/courses.ts).
 * 취향·최근 기록은 기존 추천과 같은 가중치(itemWeight)로 약하게 반영한다.
 */
export interface Course {
  /** 같은 구성이면 같은 id (저장 중복 방지) */
  id: string;
  title: string;
  vibe: CourseVibe;
  targetMinutes: CourseMinutes;
  stepIds: string[];
  totalMinutes: number;
}

export const courseBounds = (target: number) => ({
  min: Math.round(target * 0.6),
  max: Math.round(target * 1.2),
  maxItem: Math.round(target * 0.6),
});

const MIN_STEPS = 2;
const MAX_STEPS = 4;
const ATTEMPTS = 80;

export const courseId = (vibe: CourseVibe, minutes: number, stepIds: string[]) =>
  `c-${hashString(`${vibe}|${minutes}|${stepIds.join(',')}`).toString(36)}`;

export function courseTitle(vibe: CourseVibe, minutes: CourseMinutes, stepIds: string[]) {
  const options = COURSE_TITLES[vibe][minutes];
  return options[hashString(stepIds.join(',')) % options.length];
}

/** 경험 id 목록으로 코스를 다시 만든다 (URL·저장본에서 복원). 없는 경험이 있으면 undefined. */
export function buildCourse(vibe: CourseVibe, minutes: CourseMinutes, stepIds: string[]): Course | undefined {
  const steps = stepIds.map((id) => getExperience(id));
  if (steps.length < 1 || steps.some((s) => !s)) return undefined;
  return {
    id: courseId(vibe, minutes, stepIds),
    title: courseTitle(vibe, minutes, stepIds),
    vibe,
    targetMinutes: minutes,
    stepIds,
    totalMinutes: (steps as Experience[]).reduce((sum, e) => sum + e.minutes, 0),
  };
}

interface GenerateInput {
  minutes: CourseMinutes;
  vibe: CourseVibe;
  experiences?: Experience[];
  history?: UserHistory;
  /** 가능하면 피할 경험 ("다른 코스"를 누르기 전 코스 등) */
  avoidIds?: string[];
  random?: () => number;
}

/** 한 코스 안 OUT 최대 개수 */
export const MAX_OUT_STEPS = 2;

export function generateCourse({
  minutes,
  vibe,
  experiences = listExperiences(),
  history = EMPTY_HISTORY,
  avoidIds = [],
  random = Math.random,
}: GenerateInput): Course | undefined {
  const rule = findVibe(vibe);
  if (!rule) return undefined;
  const { min, max, maxItem } = courseBounds(minutes);
  const usable = experiences.filter((e) => e.minutes <= maxItem);
  const primary = usable.filter((e) => rule.primary.includes(e.categoryId));
  const secondary = usable.filter((e) => rule.secondary.includes(e.categoryId) && !rule.primary.includes(e.categoryId));

  const s = summarize(history);
  const avoid = new Set([...s.recentDone, ...avoidIds]);
  const weight = (e: Experience) => itemWeight(e, s, history, false) * (avoid.has(e.id) ? 0.1 : 1);

  let best: Experience[] | undefined;
  let bestScore = Infinity;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const steps: Experience[] = [];
    let total = 0;
    let secondaryUsed = 0;
    const wantSteps = MIN_STEPS + Math.floor(random() * (MAX_STEPS - MIN_STEPS + 1));

    while (steps.length < MAX_STEPS) {
      const options = [...primary, ...(steps.length > 0 && secondaryUsed < 1 ? secondary : [])].filter(
        (e) =>
          !steps.includes(e) &&
          total + e.minutes <= max &&
          // OUT은 한 코스에 두 개까지 (OUT → OUT → OUT처럼 밖에서 계속 화면을 보게 하지 않는다)
          (e.categoryId !== 'out' || steps.filter((x) => x.categoryId === 'out').length < MAX_OUT_STEPS) &&
          // 아무거나: 같은 카테고리를 연달아 두지 않는다
          (vibe !== 'any' || steps.length === 0 || e.categoryId !== steps[steps.length - 1].categoryId),
      );
      if (options.length === 0) break;
      const next = weightedPick(options, weight, random);
      steps.push(next);
      total += next.minutes;
      if (secondary.includes(next)) secondaryUsed++;
      if (steps.length >= MIN_STEPS && total >= min && (steps.length >= wantSteps || total >= minutes)) break;
    }

    if (steps.length < MIN_STEPS || total < min || total > max) continue;
    const variety = vibe === 'any' ? Math.max(0, 3 - new Set(steps.map((e) => e.categoryId)).size) * 4 : 0;
    const repeats = steps.filter((e) => avoid.has(e.id)).length * 6;
    const score = Math.abs(total - minutes) + variety + repeats + random();
    if (score < bestScore) {
      best = steps;
      bestScore = score;
    }
  }

  if (!best) return undefined;
  // 중심 경험 먼저, 섞은 경험은 마지막에 (예: 밖에 다녀와서 쉬기)
  const ordered = [...best.filter((e) => !secondary.includes(e)), ...best.filter((e) => secondary.includes(e))];
  return buildCourse(
    vibe,
    minutes,
    ordered.map((e) => e.id),
  );
}
