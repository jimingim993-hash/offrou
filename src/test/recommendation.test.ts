import { CATEGORIES } from '@/data/categories';
import { DURATIONS, findDuration } from '@/data/durations';
import { MOODS } from '@/data/moods';
import { getStory, listExperiences } from '@/services/experiences';
import { validateStory } from '@/features/experience/story/engine';
import { findCandidates, recommend } from '@/services/recommendation';
import type { CategoryId, MoodId } from '@/types/offrou';

const experiences = listExperiences();
const dur = (id: string) => findDuration(id)!;

/** 요구사항의 상태 → 카테고리 기준 */
const EXPECTED_CATEGORIES: Record<MoodId, CategoryId[]> = {
  rest: ['rest'],
  bedtime: ['rest'],
  play: ['play'],
  new: ['hobby', 'experience'],
  out: ['out'],
  anything: ['rest', 'play', 'hobby', 'experience', 'out'],
};

/** 시드 고정 난수 (재현 가능한 테스트용) */
const seeded = (seed = 42) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('경험 콘텐츠 데이터', () => {
  it('25개 이상, 카테고리별 5개 이상', () => {
    expect(experiences.length).toBeGreaterThanOrEqual(25);
    for (const c of CATEGORIES) {
      expect(experiences.filter((e) => e.categoryId === c.id).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('id가 겹치지 않고 필수 정보가 모두 있다', () => {
    expect(new Set(experiences.map((e) => e.id)).size).toBe(experiences.length);
    for (const e of experiences) {
      expect(e.title && e.invite && e.summary && e.doneMessage).toBeTruthy();
      expect(e.moods.length).toBeGreaterThan(0);
      expect(e.minutes).toBeGreaterThan(0);
      expect(e.steps.length).toBeGreaterThan(0);
      expect(Array.isArray(e.supplies)).toBe(true);
    }
  });

  it('EXPERIENCE는 모두 실행 가능한 이야기 데이터와 연결되어 있다', () => {
    for (const e of experiences.filter((x) => x.categoryId === 'experience')) {
      expect(e.interaction?.type, e.id).toBe('story');
      const story = e.interaction?.type === 'story' ? getStory(e.interaction.storyId) : undefined;
      expect(story, e.id).toBeDefined();
      expect(validateStory(story!), e.id).toEqual([]);
    }
  });
});

describe('추천 엔진', () => {
  it('모든 상태 × 시간 조합에 추천할 경험이 있다', () => {
    for (const m of MOODS) for (const d of DURATIONS) {
      expect(findCandidates(m.id, d).length, `${m.id}+${d.id}`).toBeGreaterThan(0);
    }
  });

  it('선택한 상태에 맞는 카테고리에서만 추천한다', () => {
    for (const m of MOODS) {
      const cats = new Set(findCandidates(m.id, dur('any')).map((e) => e.categoryId));
      expect([...cats].sort(), m.id).toEqual([...EXPECTED_CATEGORIES[m.id]].sort());
    }
  });

  it('고른 시간보다 긴 경험은 추천하지 않는다', () => {
    for (const m of MOODS) for (const d of DURATIONS) {
      if (d.minutes === null) continue;
      for (const e of findCandidates(m.id, d)) expect(e.minutes, `${m.id}+${d.id}:${e.id}`).toBeLessThanOrEqual(d.minutes);
    }
  });

  it('"상관없어"는 시간 제한이 없다', () => {
    const any = findCandidates('out', dur('any'));
    expect(any.some((e) => e.minutes >= 60)).toBe(true);
    expect(any.length).toBe(experiences.filter((e) => e.moods.includes('out' as never)).length);
  });

  it('"아무거나 해볼래"는 여러 카테고리에서 추천된다', () => {
    const random = seeded();
    const seen = new Set<CategoryId>();
    for (let i = 0; i < 100; i++) seen.add(recommend({ mood: 'anything', duration: dur('10m'), random })!.categoryId);
    expect(seen.size).toBe(5);
  });

  it('직전 추천은 연속으로 다시 나오지 않는다', () => {
    const random = seeded(7);
    for (const m of MOODS) for (const d of DURATIONS) {
      if (findCandidates(m.id, d).length < 2) continue;
      let prev = recommend({ mood: m.id, duration: d, random })!;
      for (let i = 0; i < 20; i++) {
        const next = recommend({ mood: m.id, duration: d, excludeId: prev.id, random })!;
        expect(next.id).not.toBe(prev.id);
        prev = next;
      }
    }
  });

  it('후보가 하나뿐이면 그 하나를 안전하게 다시 준다', () => {
    const only = findCandidates('out', dur('5m'));
    expect(only).toHaveLength(1);
    expect(recommend({ mood: 'out', duration: dur('5m'), excludeId: only[0].id })?.id).toBe(only[0].id);
  });

  it('후보가 없으면 undefined', () => {
    expect(recommend({ mood: 'rest', duration: dur('5m'), pool: [] })).toBeUndefined();
  });
});
