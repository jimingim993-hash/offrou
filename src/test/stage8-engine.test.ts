/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COURSE_MINUTES, COURSE_TITLES, COURSE_VIBES, findVibe, type CourseMinutes } from '@/data/courses';
import { getExperience, listExperiences } from '@/services/experiences';
import {
  EMPTY_HISTORY,
  dayKey,
  instantCandidates,
  isQuickStart,
  pickDaily,
  recommendInstant,
  seededRandom,
} from '@/services/recommendation';
import { buildCourse, courseBounds, generateCourse } from '@/services/course';
import {
  endCourseRun,
  getCourseRun,
  getSavedCourses,
  getSavedCoursesRaw,
  isCourseSaved,
  recordCourseStep,
  toggleSavedCourse,
} from '@/services/courses';
import { getTodayOffrou } from '@/services/personalization';
import { addRecord, getRecords } from '@/services/records';
import { mergeCourseRuns, mergeSavedCourses } from '@/services/sync/merge';
import { readLocalSnapshot } from '@/services/sync/snapshot';
import type { OffrouRecord, UserHistory } from '@/types/offrou';

const all = listExperiences();
const rec = (experienceId: string, daysAgo = 0, id = `r-${experienceId}-${daysAgo}`): OffrouRecord => {
  const e = getExperience(experienceId)!;
  return {
    id,
    experienceId,
    title: e.title,
    categoryId: e.categoryId,
    minutes: e.minutes,
    completedAt: new Date(Date.UTC(2026, 9, 4) - daysAgo * 86400000).toISOString(),
  };
};
const history = (records: OffrouRecord[] = []): UserHistory => ({ ...EMPTY_HISTORY, records });

describe('지금 딱 하나: 후보 규칙 (기존 메타데이터만 사용)', () => {
  it('5~15분 · 준비물 1개 이하 · 비용 없음 · 밖에 나가지 않아도 되는 · 혼자 가능', () => {
    const c = instantCandidates();
    expect(c.length).toBeGreaterThanOrEqual(10);
    for (const e of c) {
      expect(e.minutes, e.id).toBeGreaterThanOrEqual(5);
      expect(e.minutes, e.id).toBeLessThanOrEqual(15);
      expect(e.supplies.length, e.id).toBeLessThanOrEqual(1);
      expect(e.cost, e.id).not.toBe('low');
      // 14단계: 밖에서 하는 건 아주 짧은 OUT(10분 이하·무료·준비물 없음)만 바로 시작 후보
      if (e.place === 'outside') {
        expect(e.minutes, e.id).toBeLessThanOrEqual(10);
        expect(e.supplies, e.id).toHaveLength(0);
        expect(e.cost ?? 'free', e.id).toBe('free');
      }
    }
    // 여러 종류가 섞이고, EXPERIENCE 이야기도 포함된다
    expect(new Set(c.map((e) => e.categoryId)).size).toBeGreaterThanOrEqual(4);
    expect(c.some((e) => e.categoryId === 'experience')).toBe(true);
    expect(c.some((e) => e.id === 'rest-foot-bath')).toBe(false); // 준비물 3개
    expect(c.some((e) => e.id === 'out-new-menu')).toBe(false); // 밖 + 비용
  });

  it('후보가 부족하면 조건을 풀어 안전하게 채운다', () => {
    const long = all.filter((e) => !isQuickStart(e));
    expect(instantCandidates(long).length).toBeGreaterThan(0);
    expect(instantCandidates([getExperience('out-park-hour')!])).toHaveLength(1);
  });

  it('신규 사용자도 바로 하나', () => {
    const r = recommendInstant({ random: seededRandom(1) })!;
    expect(isQuickStart(r.experience)).toBe(true);
    expect(r.reason).toMatch(/이면 돼/);
  });

  it('기존 사용자: 최근 완료한 건 피하고, 한 종류만 계속 나오지 않는다', () => {
    const h = history(['rest-window', 'rest-ten-breaths', 'rest-slow-water'].map((id) => rec(id)));
    const random = seededRandom(7);
    const cats = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const r = recommendInstant({ history: h, random })!;
      expect(['rest-window', 'rest-ten-breaths', 'rest-slow-water']).not.toContain(r.experience.id);
      cats.add(r.experience.categoryId);
    }
    expect(cats.size).toBeGreaterThanOrEqual(4);
  });

  it('"다른 거": 세션에서 보여준 건 한 바퀴 돌기 전엔 다시 나오지 않는다', () => {
    const random = seededRandom(3);
    const total = instantCandidates().length;
    const seen: string[] = [];
    let prev: string | undefined;
    for (let i = 0; i < total; i++) {
      const r = recommendInstant({ seenIds: seen, excludeId: prev, random })!;
      expect(seen).not.toContain(r.experience.id);
      seen.push(r.experience.id);
      prev = r.experience.id;
    }
    const again = recommendInstant({ seenIds: seen, excludeId: prev, random })!;
    expect(again.cycled).toBe(true);
    expect(again.experience.id).not.toBe(prev);
  });
});

describe('오늘의 OFFROU', () => {
  const day = (d: number) => new Date(2026, 9, d, 9, 0, 0);

  it('같은 날짜·같은 기록이면 항상 같다 (시간대와 무관하게 날짜 기준)', () => {
    const a = pickDaily({ date: new Date(2026, 9, 4, 0, 5) })!;
    const b = pickDaily({ date: new Date(2026, 9, 4, 23, 55) })!;
    expect(a.id).toBe(b.id);
    expect(a.minutes).toBeLessThanOrEqual(30);
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('날짜가 바뀌면 바뀌고, 어제와 겹치지 않는다', () => {
    const picks: string[] = [];
    let prev: string | undefined;
    for (let d = 1; d <= 14; d++) {
      const p = pickDaily({ date: day(d), previousId: prev })!;
      if (prev) expect(p.id).not.toBe(prev);
      picks.push(p.id);
      prev = p.id;
    }
    expect(new Set(picks).size).toBeGreaterThanOrEqual(8);
  });

  it('한 번 정해지면 그날은 그대로 (오늘 해봐도 바뀌지 않음), 다음 날엔 새로', () => {
    const first = getTodayOffrou(day(4))!;
    addRecord(first);
    expect(getTodayOffrou(day(4))!.id).toBe(first.id);
    const tomorrow = getTodayOffrou(day(5))!;
    expect(tomorrow.id).not.toBe(first.id);
    expect(JSON.parse(localStorage.getItem('offrou.daily.v1')!)).toEqual({ date: '2026-10-05', experienceId: tomorrow.id });
  });
});

describe('작은 OFFROU 코스 생성', () => {
  const cases = COURSE_MINUTES.flatMap((m) => COURSE_VIBES.map((v) => [m, v.id] as const));

  it.each(cases)('%s분 · %s: 2~4개, 시간 범위 안, 분위기 규칙', (minutes, vibe) => {
    const rule = findVibe(vibe)!;
    const { min, max, maxItem } = courseBounds(minutes);
    for (let seed = 1; seed <= 25; seed++) {
      const c = generateCourse({ minutes, vibe, random: seededRandom(seed) })!;
      expect(c, `seed ${seed}`).toBeDefined();
      const steps = c.stepIds.map((id) => getExperience(id)!);
      expect(steps.length).toBeGreaterThanOrEqual(2);
      expect(steps.length).toBeLessThanOrEqual(4);
      expect(new Set(c.stepIds).size).toBe(steps.length);
      expect(c.totalMinutes).toBe(steps.reduce((s, e) => s + e.minutes, 0));
      expect(c.totalMinutes).toBeGreaterThanOrEqual(min);
      expect(c.totalMinutes).toBeLessThanOrEqual(max);
      for (const e of steps) expect(e.minutes).toBeLessThanOrEqual(maxItem);
      const secondary = steps.filter((e) => !rule.primary.includes(e.categoryId));
      expect(secondary.length).toBeLessThanOrEqual(1);
      for (const e of secondary) expect(rule.secondary).toContain(e.categoryId);
      if (vibe === 'any') for (let i = 1; i < steps.length; i++) expect(steps[i].categoryId).not.toBe(steps[i - 1].categoryId);
      expect(COURSE_TITLES[vibe][minutes]).toContain(c.title);
    }
  });

  it('20분을 골랐는데 50분 코스가 나오지 않는다', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const vibe of COURSE_VIBES.map((v) => v.id)) {
        expect(generateCourse({ minutes: 20, vibe, random: seededRandom(seed) })!.totalMinutes).toBeLessThanOrEqual(24);
      }
    }
  });

  it('"아무거나"는 여러 카테고리가 섞인다', () => {
    const random = seededRandom(11);
    const kinds = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const c = generateCourse({ minutes: 30, vibe: 'any', random })!;
      for (const id of c.stepIds) kinds.add(getExperience(id)!.categoryId);
    }
    expect(kinds.size).toBe(5);
  });

  it('"밖으로"는 OUT 중심, 밖에 다녀온 뒤 쉬는 순서', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const steps = generateCourse({ minutes: 60, vibe: 'out', random: seededRandom(seed) })!.stepIds.map((id) => getExperience(id)!);
      expect(steps[0].categoryId).toBe('out');
      const restIndex = steps.findIndex((e) => e.categoryId === 'rest');
      if (restIndex >= 0) expect(restIndex).toBe(steps.length - 1);
    }
  });

  it('"다른 코스": 직전 코스와 다르게, 최근 완료한 건 가능한 한 피한다', () => {
    const random = seededRandom(5);
    const first = generateCourse({ minutes: 30, vibe: 'calm', random })!;
    let different = 0;
    for (let i = 0; i < 20; i++) if (generateCourse({ minutes: 30, vibe: 'calm', avoidIds: first.stepIds, random })!.id !== first.id) different++;
    expect(different).toBeGreaterThanOrEqual(18);

    const done = ['rest-window', 'rest-two-songs', 'rest-dim-light'];
    const c = generateCourse({ minutes: 20, vibe: 'calm', history: history(done.map((id) => rec(id))), random })!;
    expect(c.stepIds.filter((id) => done.includes(id)).length).toBe(0);
  });

  it('같은 구성은 같은 id·이름, URL에서 다시 만들 수 있다', () => {
    const c = generateCourse({ minutes: 30, vibe: 'new', random: seededRandom(2) })!;
    const again = buildCourse('new', 30, c.stepIds)!;
    expect(again).toEqual(c);
    expect(buildCourse('new', 30, ['nope'])).toBeUndefined();
  });
});

describe('코스 기록·저장 (이 기기)', () => {
  const course = buildCourse('calm', 20, ['rest-window', 'rest-dim-light', 'rest-ten-breaths'])!;

  it('진행 기록: 마친 시간만, 끝낸 시각, 아무것도 안 했으면 기록 없음', () => {
    endCourseRun('run-empty', course);
    expect(getCourseRun('run-empty')).toBeUndefined();

    recordCourseStep('run-1', course, 'rest-window');
    recordCourseStep('run-1', course, 'rest-window'); // 중복 무시
    recordCourseStep('run-1', course, 'rest-dim-light');
    endCourseRun('run-1', course);
    const run = getCourseRun('run-1')!;
    expect(run.completedIds).toEqual(['rest-window', 'rest-dim-light']);
    expect(run.title).toBe(course.title);
    expect(run.endedAt).toBeDefined();
  });

  it('코스 저장/취소 (취소는 tombstone으로 남는다)', () => {
    expect(toggleSavedCourse(course)).toBe(true);
    expect(isCourseSaved(course.id)).toBe(true);
    expect(getSavedCourses()[0]).toMatchObject({ title: course.title, stepIds: course.stepIds, vibe: 'calm', targetMinutes: 20 });
    expect(toggleSavedCourse(course)).toBe(false);
    expect(getSavedCourses()).toEqual([]);
    expect(getSavedCoursesRaw()[0].removedAt).toBeDefined();
  });

  it('동기화 묶음에 코스가 포함된다', () => {
    recordCourseStep('run-2', course, 'rest-window');
    toggleSavedCourse(course);
    const snap = readLocalSnapshot();
    expect(snap.courseRuns.map((r) => r.id)).toEqual(['run-2']);
    expect(snap.savedCourses).toHaveLength(1);
  });
});

describe('코스 병합 (다른 기기)', () => {
  const base = {
    courseId: 'c1',
    title: '조용한 20분',
    vibe: 'calm' as const,
    targetMinutes: 20 as CourseMinutes,
    stepIds: ['a', 'b', 'c'],
    startedAt: '2026-10-04T01:00:00.000Z',
  };

  it('같은 진행이면 마친 시간을 합치고, 끝낸 기록을 잃지 않는다', () => {
    const phone = { ...base, id: 'run', completedIds: ['a'], updatedAt: '2026-10-04T01:05:00.000Z', endedAt: '2026-10-04T01:06:00.000Z' };
    const tablet = { ...base, id: 'run', completedIds: ['a', 'b'], updatedAt: '2026-10-04T01:10:00.000Z' };
    const merged = mergeCourseRuns([phone], [tablet]);
    expect(merged).toHaveLength(1);
    expect(merged[0].completedIds).toEqual(['a', 'b']);
    expect(merged[0].endedAt).toBe(phone.endedAt);
    expect(mergeCourseRuns([phone], [{ ...tablet, id: 'other' }])).toHaveLength(2);
  });

  it('저장한 코스: 나중에 일어난 저장/취소가 이긴다', () => {
    const saved = { id: 'c1', title: 't', vibe: 'calm' as const, targetMinutes: 20 as CourseMinutes, stepIds: ['a', 'b'], savedAt: '2026-10-01T00:00:00Z' };
    const removed = { ...saved, removedAt: '2026-10-02T00:00:00Z' };
    expect(mergeSavedCourses([saved], [removed])[0].removedAt).toBeDefined();
    expect(mergeSavedCourses([removed], [{ ...saved, savedAt: '2026-10-03T00:00:00Z' }])[0].removedAt).toBeUndefined();
  });
});

describe('이전 데이터 호환·서버 스키마', () => {
  it('7단계까지의 기록(코스 정보 없음)과 저장소는 그대로 읽힌다', () => {
    localStorage.setItem(
      'offrou.records.v1',
      JSON.stringify([{ id: 'old', experienceId: 'rest-window', title: '창밖 바라보기', categoryId: 'rest', minutes: 5, completedAt: '2026-10-01T00:00:00.000Z' }]),
    );
    expect(getRecords()[0].courseRunId).toBeUndefined();
    const snap = readLocalSnapshot();
    expect(snap.courseRuns).toEqual([]);
    expect(snap.savedCourses).toEqual([]);
  });

  it('코스 테이블 마이그레이션: RLS·본인 행 정책·기존 테이블 확장', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261004000000_offrou_courses.sql'), 'utf8');
    expect(sql).toContain('alter table public.offrou_completions\n  add column if not exists course_run_id text');
    for (const t of ['offrou_course_runs', 'offrou_saved_courses']) {
      expect(sql).toContain(`alter table public.${t} enable row level security`);
      expect(sql).toMatch(new RegExp(`create policy "${t}_own" on public\\.${t}[\\s\\S]*?using \\(\\(select auth\\.uid\\(\\)\\) = user_id\\)[\\s\\S]*?with check`));
      expect(sql).toMatch(new RegExp(`${t} \\([\\s\\S]*?user_id uuid not null default auth\\.uid\\(\\) references auth\\.users \\(id\\) on delete cascade`));
    }
    expect(sql).toMatch(/revoke all on public\.offrou_course_runs, public\.offrou_saved_courses from anon/);
  });
});

