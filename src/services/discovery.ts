import { CATEGORIES } from '@/data/categories';
import { DURATIONS } from '@/data/durations';
import type { CategoryId, DurationId, Experience } from '@/types/offrou';
import { listExperiences } from './experiences';

/**
 * 발견(직접 고르기)용 검색·필터. 외부 API 없이 OFFROU 내부 콘텐츠만 다룬다.
 * HOME 추천 엔진(recommendation.ts)과는 독립적이다.
 */

export type PlaceFilter = 'any' | 'home' | 'outside';

export interface DiscoverFilter {
  q: string;
  category?: CategoryId;
  /** 이 시간 안에 할 수 있는 경험만 ('any' 제외) */
  time?: Exclude<DurationId, 'any'>;
  place: PlaceFilter;
}

export const EMPTY_FILTER: DiscoverFilter = { q: '', place: 'any' };

/** 대소문자·공백 차이를 무시하고 비교 */
export const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');

const tokenize = (q: string) => q.trim().split(/\s+/).map(normalize).filter(Boolean);

const maxMinutes = (time: DiscoverFilter['time']) => DURATIONS.find((d) => d.id === time)?.minutes ?? null;

/** 검색어를 뺀 나머지 조건(카테고리·시간·장소) */
function passesFilters(e: Experience, f: DiscoverFilter) {
  if (f.category && e.categoryId !== f.category) return false;
  const limit = maxMinutes(f.time);
  if (limit !== null && e.minutes > limit) return false;
  if (f.place === 'home' && e.place === 'outside') return false;
  if (f.place === 'outside' && e.place !== 'outside') return false;
  return true;
}

/**
 * 검색 점수. 모든 검색어가 어딘가에 있어야 하고(AND), 제목 > 태그 > 설명·카테고리 순으로 가중치.
 * 하나라도 없으면 0.
 */
export function scoreExperience(e: Experience, tokens: string[]): number {
  const category = CATEGORIES.find((c) => c.id === e.categoryId);
  const title = normalize(e.title);
  const tags = e.tags.map(normalize);
  const text = normalize(
    [e.invite, e.summary, category?.code ?? '', category?.name ?? '', category?.short ?? ''].join(' '),
  );
  let score = 0;
  for (const t of tokens) {
    const s = (title.includes(t) ? 3 : 0) + (tags.some((tag) => tag.includes(t)) ? 2 : 0) + (text.includes(t) ? 1 : 0);
    if (s === 0) return 0;
    score += s;
  }
  return score;
}

/** 전체 보기에서는 카테고리를 번갈아 섞어 첫 화면부터 다양하게 보이게 한다 */
export function interleaveByCategory(list: Experience[]): Experience[] {
  const groups = CATEGORIES.map((c) => list.filter((e) => e.categoryId === c.id));
  const out: Experience[] = [];
  for (let i = 0; out.length < list.length; i++) for (const g of groups) if (g[i]) out.push(g[i]);
  return out;
}

export function searchExperiences(filter: DiscoverFilter, pool: Experience[] = listExperiences()): Experience[] {
  const filtered = pool.filter((e) => passesFilters(e, filter));
  const tokens = tokenize(filter.q);
  if (tokens.length === 0) return filter.category ? filtered : interleaveByCategory(filtered);
  return filtered
    .map((e, i) => ({ e, i, score: scoreExperience(e, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.e);
}

export const isDefaultFilter = (f: DiscoverFilter) => !f.q.trim() && !f.category && !f.time && f.place === 'any';

const shuffle = <T>(list: T[], random: () => number) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * 결과가 없을 때 "대신 이런 건 어때?"로 보여줄 경험 1~3개.
 * 검색어 → 시간·장소 순으로 조건을 풀어 가까운 것부터 찾고, 그래도 없으면 전체에서 고른다.
 */
export function suggestAlternatives(
  filter: DiscoverFilter,
  pool: Experience[] = listExperiences(),
  random: () => number = Math.random,
  limit = 3,
): Experience[] {
  const steps: DiscoverFilter[] = [
    { ...filter, q: '' },
    { ...EMPTY_FILTER, category: filter.category },
    EMPTY_FILTER,
  ];
  for (const f of steps) {
    const found = searchExperiences(f, pool);
    if (found.length) return shuffle(found, random).slice(0, limit);
  }
  return [];
}

export const pickRandom = <T>(list: T[], random: () => number = Math.random): T | undefined =>
  list.length ? list[Math.floor(random() * list.length)] : undefined;

/** 처음 만나는 시간: 아직 완료하지 않은 경험 중 하나 (모두 해봤다면 전체 중 하나) */
export function pickFirstMeet(
  list: Experience[],
  completedIds: Set<string>,
  random: () => number = Math.random,
): Experience | undefined {
  const untried = list.filter((e) => !completedIds.has(e.id));
  return pickRandom(untried.length ? untried : list, random);
}
