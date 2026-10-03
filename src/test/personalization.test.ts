import { findDuration } from '@/data/durations';
import { getExperience, listExperiences } from '@/services/experiences';
import {
  EMPTY_HISTORY,
  candidatesFor,
  explainRecommendation,
  findCandidates,
  recommendExperience,
} from '@/services/recommendation';
import { getMyOverview } from '@/services/personalization';
import { addRecord, getRecords } from '@/services/records';
import { getFeedback, getFeedbackFor, setFeedback } from '@/services/feedback';
import { getSaved, isSaved, toggleSaved } from '@/services/saved';
import { RECENT_LIMIT, getActivity, getSessionSeen, noteShown, setSessionSeen } from '@/services/activity';
import { resetAllData } from '@/services/storage';
import type { CategoryId, FeedbackValue, OffrouRecord, UserHistory } from '@/types/offrou';

const dur = (id: string) => findDuration(id)!;

const seeded = (seed = 42) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

let n = 0;
const rec = (experienceId: string, daysAgo = 30): OffrouRecord => {
  const e = getExperience(experienceId)!;
  return {
    id: `r${n++}`,
    experienceId,
    title: e.title,
    categoryId: e.categoryId,
    minutes: e.minutes,
    completedAt: new Date(Date.UTC(2026, 9, 3) - daysAgo * 86400000).toISOString(),
  };
};

const history = (
  records: OffrouRecord[],
  feedback: [OffrouRecord, FeedbackValue][] = [],
  recentShown: string[] = [],
): UserHistory => ({
  records,
  feedback: feedback.map(([r, value]) => ({
    recordId: r.id,
    experienceId: r.experienceId,
    categoryId: r.categoryId,
    value,
    at: r.completedAt,
  })),
  activity: { recentShown, skipped: {}, started: {} },
});

/** 여러 번 추천해서 카테고리 비율을 센다 */
function share(input: Parameters<typeof recommendExperience>[0], runs = 3000) {
  const random = seeded(7);
  const counts = new Map<CategoryId, number>();
  const ids = new Map<string, number>();
  for (let i = 0; i < runs; i++) {
    const r = recommendExperience({ ...input, random })!;
    counts.set(r.experience.categoryId, (counts.get(r.experience.categoryId) ?? 0) + 1);
    ids.set(r.experience.id, (ids.get(r.experience.id) ?? 0) + 1);
  }
  return { cat: (c: CategoryId) => (counts.get(c) ?? 0) / runs, ids, categories: counts.size };
}

describe('추천 엔진: 기본 조건', () => {
  it('신규 사용자도 상태+시간 조건에 맞게 추천받는다', () => {
    const r = recommendExperience({ mood: 'rest', duration: dur('10m') })!;
    expect(r.experience.categoryId).toBe('rest');
    expect(r.experience.minutes).toBeLessThanOrEqual(10);
    expect(r.reason).toBe('지금 10분이면 충분해.');
  });

  it('기록이 있어도 시간·상태 조건은 절대 넘지 않는다', () => {
    const h = history([rec('hobby-drawing'), rec('out-park-hour')], [[rec('out-park-hour'), 'good']]);
    const random = seeded(3);
    for (let i = 0; i < 300; i++) {
      const e = recommendExperience({ mood: 'rest', duration: dur('5m'), history: h, random })!.experience;
      expect(e.categoryId).toBe('rest');
      expect(e.minutes).toBeLessThanOrEqual(5);
    }
  });
});

describe('추천 엔진: 개인화', () => {
  const hobbyRecords = ['hobby-drawing', 'hobby-new-genre', 'hobby-photo-theme', 'hobby-one-paragraph'].map((id) => rec(id, 40));
  const liked = history(hobbyRecords, hobbyRecords.map((r) => [r, 'good'] as [OffrouRecord, FeedbackValue]));

  it('좋았어를 남긴 카테고리가 더 자주 추천된다', () => {
    const base = share({ mood: 'new', duration: dur('any'), exploreRate: 0 });
    const personal = share({ mood: 'new', duration: dur('any'), history: liked, exploreRate: 0 });
    expect(personal.cat('hobby')).toBeGreaterThan(base.cat('hobby') + 0.1);
  });

  it('그래도 다른 카테고리가 꾸준히 섞인다 (한 카테고리만 계속 X)', () => {
    const personal = share({ mood: 'new', duration: dur('any'), history: liked });
    expect(personal.cat('experience')).toBeGreaterThan(0.25);
  });

  it('"아무거나"에서 한 카테고리를 많이 좋아해도 여러 카테고리가 나온다', () => {
    const rests = ['rest-window', 'rest-two-songs', 'rest-dim-light', 'rest-warm-drink', 'rest-ten-breaths'].map((id) =>
      rec(id, 20),
    );
    const h = history(rests, rests.map((r) => [r, 'good'] as [OffrouRecord, FeedbackValue]));
    const s = share({ mood: 'anything', duration: dur('30m'), history: h });
    expect(s.categories).toBe(5);
    expect(s.cat('rest')).toBeLessThan(0.5);
  });

  it('그냥 그랬어를 남긴 카테고리는 덜 추천된다', () => {
    const meh = history(hobbyRecords, hobbyRecords.map((r) => [r, 'meh'] as [OffrouRecord, FeedbackValue]));
    const s = share({ mood: 'new', duration: dur('any'), history: meh, exploreRate: 0 });
    expect(s.cat('hobby')).toBeLessThan(0.45);
    expect(s.cat('hobby')).toBeGreaterThan(0.1); // 아예 사라지지는 않는다
  });

  it('아직 해보지 않은 경험이 정상적으로 (더 자주) 추천된다', () => {
    const pool = findCandidates('rest', dur('10m'));
    const untried = pool[pool.length - 1];
    const done = pool.filter((e) => e !== untried).map((e) => rec(e.id, 60));
    const s = share({ mood: 'rest', duration: dur('10m'), history: history([...done, ...done.map((d) => rec(d.experienceId, 90))]) });
    const top = [...s.ids.entries()].sort((a, b) => b[1] - a[1])[0][0];
    expect(top).toBe(untried.id);
  });
});

describe('추천 엔진: 반복 방지와 fallback', () => {
  it('최근 완료한 경험은 바로 다시 추천하지 않는다', () => {
    const h = history([rec('rest-window', 0)]);
    const random = seeded(1);
    for (let i = 0; i < 100; i++) {
      expect(recommendExperience({ mood: 'rest', duration: dur('5m'), history: h, random })!.experience.id).toBe('rest-ten-breaths');
    }
  });

  it('최근 추천된 경험도 우선 제외한다', () => {
    const h = history([], [], ['rest-ten-breaths']);
    expect(recommendExperience({ mood: 'rest', duration: dur('5m'), history: h })!.experience.id).toBe('rest-window');
  });

  it('세션 안에서는 후보를 한 바퀴 다 보여준 뒤에만 순환한다', () => {
    const random = seeded(5);
    const total = candidatesFor('new', dur('any')).length;
    const seen: string[] = [];
    let prev: string | undefined;
    for (let i = 0; i < total; i++) {
      const r = recommendExperience({ mood: 'new', duration: dur('any'), seenIds: seen, excludeId: prev, random })!;
      expect(seen).not.toContain(r.experience.id);
      expect(r.cycled).toBe(false);
      seen.push(r.experience.id);
      prev = r.experience.id;
    }
    const again = recommendExperience({ mood: 'new', duration: dur('any'), seenIds: seen, excludeId: prev, random })!;
    expect(again.cycled).toBe(true);
    expect(again.experience.id).not.toBe(prev);
  });

  it('모든 후보가 최근·세션에 걸려도 멈추지 않고 하나를 준다', () => {
    const ids = findCandidates('out', dur('5m')).map((e) => e.id);
    const h = history(ids.map((id) => rec(id, 0)), [], ids);
    const r = recommendExperience({ mood: 'out', duration: dur('5m'), history: h, seenIds: ids, excludeId: ids[0] });
    expect(r?.experience.id).toBe(ids[0]);
  });

  it('후보가 없으면 undefined (화면은 안내를 보여준다)', () => {
    expect(recommendExperience({ mood: 'rest', duration: dur('5m'), experiences: [] })).toBeUndefined();
  });
});

describe('추천 엔진: 평소와 조금 다른 시간', () => {
  const restHeavy = history(
    ['rest-window', 'rest-two-songs', 'rest-dim-light', 'rest-ten-breaths', 'rest-screen-down'].map((id) => rec(id, 30)),
  );

  it('fresh 모드는 상태 조건을 넓혀 다른 카테고리를 우선한다', () => {
    const s = share({ mood: 'rest', duration: dur('10m'), history: restHeavy, mode: 'fresh' });
    expect(s.cat('rest')).toBeLessThan(0.1);
    expect(s.categories).toBeGreaterThanOrEqual(4);
  });

  it('fresh 모드도 시간 조건은 지킨다', () => {
    const random = seeded(9);
    for (let i = 0; i < 200; i++) {
      expect(
        recommendExperience({ mood: 'rest', duration: dur('10m'), mode: 'fresh', history: restHeavy, random })!.experience.minutes,
      ).toBeLessThanOrEqual(10);
    }
  });

  it('자기 전에는 fresh여도 차분한 경험만', () => {
    expect(candidatesFor('bedtime', dur('any'), 'fresh').every((e) => e.categoryId === 'rest')).toBe(true);
  });
});

describe('추천 이유', () => {
  const exp = getExperience('rest-window')!;

  it('상황에 맞는 짧은 문구', () => {
    expect(explainRecommendation(exp, { duration: dur('10m') })).toBe('지금 10분이면 충분해.');
    expect(explainRecommendation(exp, { duration: dur('any') })).toBe('오늘은 시간 걱정 없이.');
    expect(explainRecommendation(exp, { duration: dur('10m'), mode: 'fresh' })).toBe('평소와 조금 다른 시간이야.');
    expect(explainRecommendation(exp, { duration: dur('10m'), history: history([rec('hobby-drawing')]) })).toBe(
      '아직 해보지 않은 시간이야.',
    );
    const restful = history(['rest-window', 'rest-two-songs', 'rest-dim-light'].map((id) => rec(id)));
    expect(explainRecommendation(exp, { duration: dur('10m'), history: restful })).toBe('요즘 쉬는 시간을 자주 찾았네.');
  });

  it('"분석" 같은 표현은 쓰지 않는다', () => {
    const random = seeded(2);
    for (const e of listExperiences()) {
      for (const mode of ['usual', 'fresh'] as const) {
        const text = explainRecommendation(e, { duration: dur('30m'), mode, history: random() > 0.5 ? EMPTY_HISTORY : history([rec(e.id)]) });
        expect(text).not.toMatch(/분석|알고리즘|데이터|성향/);
      }
    }
  });
});

describe('MY 요약', () => {
  const now = new Date(2026, 9, 20);
  const at = (id: string, date: Date) => ({ ...rec(id), completedAt: date.toISOString() });

  it('이번 달 횟수와 카테고리별 횟수', () => {
    const records = [
      at('rest-window', new Date(2026, 9, 1)),
      at('rest-two-songs', new Date(2026, 9, 5)),
      at('exp-radio-dj', new Date(2026, 9, 6)),
      at('hobby-drawing', new Date(2026, 8, 28)), // 지난달
    ];
    const o = getMyOverview(now, records);
    expect(o.monthCount).toBe(3);
    expect(o.monthByCategory).toEqual([
      { categoryId: 'rest', count: 2 },
      { categoryId: 'experience', count: 1 },
    ]);
  });

  it('자주 보낸 시간은 실제 기록으로 계산한다', () => {
    const records = ['rest-window', 'exp-radio-dj', 'rest-two-songs', 'exp-detective', 'rest-dim-light', 'play-doodle'].map((id) =>
      at(id, new Date(2026, 9, 10)),
    );
    expect(getMyOverview(now, records).frequent).toEqual(['rest', 'experience']);
  });

  it('기록이 부족하면 취향을 단정하지 않는다', () => {
    expect(getMyOverview(now, []).frequent).toEqual([]);
    expect(getMyOverview(now, [at('rest-window', now), at('rest-two-songs', now)]).frequent).toEqual([]);
    // 세 번이어도 모두 다른 카테고리면 표시하지 않음
    expect(getMyOverview(now, ['rest-window', 'play-doodle', 'out-sky'].map((id) => at(id, now))).frequent).toEqual([]);
  });
});

describe('로컬 저장소', () => {
  it('피드백: 좋았어·그냥 그랬어 저장, 다시 누르면 바뀐다', () => {
    const r = addRecord(getExperience('rest-window')!);
    setFeedback(r, 'good');
    expect(getFeedbackFor(r.id)).toBe('good');
    setFeedback(r, 'meh');
    expect(getFeedbackFor(r.id)).toBe('meh');
    expect(getFeedback()).toHaveLength(1);
    expect(getFeedback()[0]).toMatchObject({ experienceId: 'rest-window', categoryId: 'rest', value: 'meh' });
  });

  it('저장/저장 취소', () => {
    expect(toggleSaved('out-sky')).toBe(true);
    expect(toggleSaved('exp-radio-dj')).toBe(true);
    expect(isSaved('out-sky')).toBe(true);
    expect(getSaved()).toHaveLength(2);
    expect(toggleSaved('out-sky')).toBe(false);
    expect(getSaved().map((s) => s.experienceId)).toEqual(['exp-radio-dj']);
  });

  it('최근 추천 기록은 일정 개수만 남는다', () => {
    for (const e of listExperiences().slice(0, RECENT_LIMIT + 4)) noteShown(e.id);
    expect(getActivity().recentShown).toHaveLength(RECENT_LIMIT);
  });

  it('초기화하면 모든 OFFROU 데이터가 사라지고 처음 상태가 된다', () => {
    const r = addRecord(getExperience('rest-window')!);
    setFeedback(r, 'good');
    toggleSaved('out-sky');
    noteShown('rest-window');
    setSessionSeen('k', ['rest-window']);
    localStorage.setItem('other-app', 'keep');

    resetAllData();

    expect(getRecords()).toEqual([]);
    expect(getFeedback()).toEqual([]);
    expect(getSaved()).toEqual([]);
    expect(getActivity()).toEqual({ recentShown: [], skipped: {}, started: {} });
    expect(getSessionSeen('k')).toEqual([]);
    expect(localStorage.getItem('other-app')).toBe('keep'); // 다른 데이터는 건드리지 않는다
  });
});
