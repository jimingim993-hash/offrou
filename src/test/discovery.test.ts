import { CATEGORIES } from '@/data/categories';
import { STORIES } from '@/data/stories';
import { getExperience, listExperiences } from '@/services/experiences';
import {
  EMPTY_FILTER,
  interleaveByCategory,
  normalize,
  pickFirstMeet,
  pickRandom,
  searchExperiences,
  suggestAlternatives,
  type DiscoverFilter,
} from '@/services/discovery';
import { RECENT_VIEW_LIMIT, getActivity, getRecentViewed, noteStarted, noteViewed } from '@/services/activity';
import { getRecords } from '@/services/records';

const all = listExperiences();
const f = (patch: Partial<DiscoverFilter>): DiscoverFilter => ({ ...EMPTY_FILTER, ...patch });
const ids = (list: { id: string }[]) => list.map((e) => e.id);

describe('5단계 콘텐츠', () => {
  it('전체 50개 이상, 카테고리별 10개 이상', () => {
    expect(all.length).toBeGreaterThanOrEqual(50);
    for (const c of CATEGORIES) expect(all.filter((e) => e.categoryId === c.id).length, c.code).toBeGreaterThanOrEqual(10);
  });

  it('EXPERIENCE 10개는 모두 이야기 엔진과 연결된다', () => {
    expect(STORIES.length).toBeGreaterThanOrEqual(10);
    for (const s of STORIES) expect(getExperience(s.experienceId)?.interaction).toEqual({ type: 'story', storyId: s.experienceId });
  });

  it('복제 콘텐츠가 없다 (제목·건네는 문장·설명이 모두 다르다)', () => {
    for (const key of ['title', 'invite', 'summary'] as const) {
      expect(new Set(all.map((e) => e[key])).size, key).toBe(all.length);
    }
  });

  it('모든 경험에 태그가 있다', () => {
    for (const e of all) expect(e.tags.length, e.id).toBeGreaterThanOrEqual(3);
  });

  it('카테고리마다 한글 설명이 있다', () => {
    expect(CATEGORIES.map((c) => c.short)).toEqual([
      '쉬어가는 시간',
      '가볍게 노는 시간',
      '새로운 걸 맛보는 시간',
      '다른 하루를 살아보는 시간',
      '밖으로 나가는 시간',
    ]);
  });
});

describe('검색', () => {
  it('제목으로 찾는다', () => {
    expect(ids(searchExperiences(f({ q: '심야' })))).toContain('exp-radio-dj');
    expect(searchExperiences(f({ q: '심야 라디오' }))[0].id).toBe('exp-radio-dj');
  });

  it('설명으로 찾는다', () => {
    const found = searchExperiences(f({ q: '그럴듯한' }));
    expect(ids(found)).toEqual(['play-tiny-museum']);
    // 제목·태그에는 없는 단어
    expect(normalize(found[0].title + found[0].tags.join())).not.toContain('그럴듯한');
  });

  it('태그로 찾는다', () => {
    const quiet = searchExperiences(f({ q: '조용' }));
    expect(quiet.length).toBeGreaterThan(3);
    expect(quiet.some((e) => e.categoryId === 'rest')).toBe(true);
    expect(quiet.every((e) => e.tags.some((t) => t.includes('조용')) || normalize(e.summary + e.invite).includes('조용'))).toBe(true);
  });

  it('요구사항 예시: 산책 → OUT, 그림 → 드로잉', () => {
    const walk = searchExperiences(f({ q: '산책' }));
    expect(walk.filter((e) => e.categoryId === 'out').length).toBeGreaterThanOrEqual(3);
    expect(ids(searchExperiences(f({ q: '그림' })))).toContain('hobby-drawing');
  });

  it('여러 단어는 모두 포함해야 한다 (AND), 공백·대소문자 무시', () => {
    expect(ids(searchExperiences(f({ q: '밤 기차' })))).toEqual(['exp-night-train']);
    // 카테고리 코드도 대소문자 상관없이 찾는다
    expect(ids(searchExperiences(f({ q: 'Rest' })))).toEqual(expect.arrayContaining(ids(all.filter((e) => e.categoryId === 'rest'))));
    expect(ids(searchExperiences(f({ q: '  심 야  ' })))).toContain('exp-radio-dj');
  });

  it('제목에 맞는 경험이 태그·설명에만 맞는 경험보다 앞선다', () => {
    const r = searchExperiences(f({ q: '도서관' }));
    expect(r[0].id).toBe('out-library');
  });

  it('없는 말은 빈 결과', () => {
    expect(searchExperiences(f({ q: 'zzqqxx' }))).toEqual([]);
  });
});

describe('필터', () => {
  it.each(CATEGORIES.map((c) => [c.code, c.id] as const))('%s 카테고리만', (_, id) => {
    const r = searchExperiences(f({ category: id }));
    expect(r.length).toBe(all.filter((e) => e.categoryId === id).length);
    expect(r.every((e) => e.categoryId === id)).toBe(true);
  });

  it('시간: 고른 시간 안에 할 수 있는 것만', () => {
    for (const [time, limit] of [['5m', 5], ['10m', 10], ['30m', 30], ['1h', 60]] as const) {
      const r = searchExperiences(f({ time }));
      expect(r.every((e) => e.minutes <= limit)).toBe(true);
      expect(r.length).toBe(all.filter((e) => e.minutes <= limit).length);
    }
  });

  it('장소: 집에서 / 밖에서', () => {
    const home = searchExperiences(f({ place: 'home' }));
    const out = searchExperiences(f({ place: 'outside' }));
    expect(home.every((e) => e.place !== 'outside')).toBe(true);
    expect(out.every((e) => e.place === 'outside')).toBe(true);
    expect(home.length + out.length).toBe(all.length);
  });

  it('여러 조건을 함께', () => {
    const r = searchExperiences(f({ category: 'hobby', time: '10m', place: 'home', q: '그림' }));
    expect(ids(r)).toEqual(['hobby-drawing']);
    expect(searchExperiences(f({ category: 'out', place: 'home' }))).toEqual([]);
  });

  it('전체 보기는 첫 화면부터 카테고리가 섞여 보인다', () => {
    const first = searchExperiences(EMPTY_FILTER).slice(0, 5);
    expect(new Set(first.map((e) => e.categoryId)).size).toBe(5);
    expect(interleaveByCategory(all)).toHaveLength(all.length);
  });
});

describe('제안·랜덤·처음 만나는 시간', () => {
  it('결과가 없으면 가까운 조건에서 1~3개를 제안한다', () => {
    const s = suggestAlternatives(f({ q: 'zzqqxx', category: 'hobby' }));
    expect(s.length).toBeGreaterThanOrEqual(1);
    expect(s.length).toBeLessThanOrEqual(3);
    expect(s.every((e) => e.categoryId === 'hobby')).toBe(true);

    const impossible = suggestAlternatives(f({ category: 'out', place: 'home' }));
    expect(impossible.length).toBeGreaterThan(0);
    expect(impossible.every((e) => e.categoryId === 'out')).toBe(true);
  });

  it('랜덤은 주어진 목록 안에서만 고른다', () => {
    const list = searchExperiences(f({ category: 'out', time: '5m' }));
    for (let i = 0; i < 30; i++) expect(ids(list)).toContain(pickRandom(list)!.id);
    expect(pickRandom([])).toBeUndefined();
  });

  it('처음 만나는 시간은 아직 완료하지 않은 경험', () => {
    const play = searchExperiences(f({ category: 'play' }));
    const done = new Set(ids(play.slice(1)));
    for (let i = 0; i < 20; i++) expect(pickFirstMeet(play, done)!.id).toBe(play[0].id);
    // 모두 해봤다면 전체 중 하나
    expect(ids(play)).toContain(pickFirstMeet(play, new Set(ids(play)))!.id);
  });
});

describe('최근 본 시간', () => {
  it('최근 것이 앞, 중복 없이, 최대 5개', () => {
    for (const e of all.slice(0, RECENT_VIEW_LIMIT + 2)) noteViewed(e.id);
    noteViewed(all[3].id);
    const viewed = getRecentViewed();
    expect(viewed).toHaveLength(RECENT_VIEW_LIMIT);
    expect(viewed[0]).toBe(all[3].id);
    expect(new Set(viewed).size).toBe(viewed.length);
  });

  it('시작하면 최근 본 시간에서 빠진다', () => {
    noteViewed('out-sky');
    noteViewed('rest-window');
    noteStarted('out-sky');
    expect(getRecentViewed()).toEqual(['rest-window']);
  });
});

describe('이전 버전 데이터 호환', () => {
  it('4단계 activity(최근 본 시간 필드 없음)를 그대로 읽는다', () => {
    localStorage.setItem(
      'offrou.activity.v1',
      JSON.stringify({ recentShown: ['rest-window'], skipped: { 'out-sky': 2 }, started: { 'rest-window': 1 } }),
    );
    expect(getActivity()).toEqual({
      recentShown: ['rest-window'],
      skipped: { 'out-sky': 2 },
      started: { 'rest-window': 1 },
      recentViewed: [],
    });
    noteViewed('out-sky');
    expect(getActivity().skipped).toEqual({ 'out-sky': 2 }); // 기존 값 유지
  });

  it('2단계 형식의 기록(kind·결말 없음)도 그대로 읽는다', () => {
    localStorage.setItem(
      'offrou.records.v1',
      JSON.stringify([
        { id: 'old1', experienceId: 'rest-window', title: '창밖 바라보기', categoryId: 'rest', minutes: 5, completedAt: '2026-10-01T10:00:00.000Z' },
      ]),
    );
    expect(getRecords()).toHaveLength(1);
    expect(getRecords()[0].experienceId).toBe('rest-window');
  });
});
