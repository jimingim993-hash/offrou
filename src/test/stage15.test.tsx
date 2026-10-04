/// <reference types="node" />
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { routes } from '@/app/router';
import { CATEGORIES } from '@/data/categories';
import { MOODS } from '@/data/moods';
import { DURATIONS } from '@/data/durations';
import { COURSE_MINUTES, COURSE_VIBES } from '@/data/courses';
import { getPlayProgram } from '@/data/play/programs';
import { getHobbyProgram } from '@/data/hobby/programs';
import { getRestProgram } from '@/data/rest/programs';
import { getOutProgram } from '@/data/out/programs';
import { STORIES } from '@/data/stories';
import { validateStories } from '@/features/experience/story/engine';
import { getExperience, getStory, listExperiences } from '@/services/experiences';
import { getRecords } from '@/services/records';
import { candidatesFor, instantCandidates, pickDaily, recommendExperience, seededRandom } from '@/services/recommendation';
import { courseBounds, generateCourse } from '@/services/course';
import type { CategoryId, Experience } from '@/types/offrou';

const renderAt = (path: string) => {
  cleanup();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};
type User = ReturnType<typeof userEvent.setup>;
const ALL = listExperiences();

/** 콘텐츠마다 어떤 엔진이 맡는지 */
function engineOf(e: Experience): string {
  const i = e.interaction;
  if (!i) return 'guide';
  if (i.type === 'play') return getPlayProgram(i.program) ? 'PlayEngine' : 'broken';
  if (i.type === 'hobby') return getHobbyProgram(i.program) ? 'HobbyEngine' : 'broken';
  if (i.type === 'rest') return i.program ? (getRestProgram(i.program) ? 'RestEngine' : 'broken') : 'RestRunner';
  if (i.type === 'guide') return i.program ? (getOutProgram(i.program) ? 'OutEngine' : 'broken') : 'GuideRunner';
  if (i.type === 'story') return getStory(i.storyId) ? 'ExperienceEngine' : 'broken';
  if (i.type === 'prompts') return i.prompts.length ? 'PromptRunner' : 'broken';
  if (i.type === 'focus') return i.subjects.length ? 'FocusRunner' : 'broken';
  return 'broken';
}

/** 카테고리별로 허용되는 엔진 */
const ENGINES: Record<CategoryId, string[]> = {
  play: ['PlayEngine', 'PromptRunner'],
  hobby: ['HobbyEngine', 'FocusRunner'],
  rest: ['RestEngine', 'RestRunner'],
  experience: ['ExperienceEngine'],
  out: ['OutEngine'],
};

/** 지금 화면의 실행 화면을 끝까지 (각 엔진의 실제 종료 경로) */
async function complete(user: User, e: Experience) {
  const i = e.interaction;
  if (i?.type === 'story') {
    const story = getStory(i.storyId)!;
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    for (let n = 0; n < 12; n++) {
      if (screen.queryByText('오늘의 이야기')) break;
      const title = screen.getByRole('heading', { level: 2 }).textContent;
      const scene = story.scenes.find((s) => s.title === title && (s.choices ?? []).every((c) => screen.queryByRole('button', { name: c.label })))!;
      await user.click(screen.getByRole('button', { name: scene.choices?.[0].label ?? '다음' }));
    }
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
  } else if (i?.type === 'prompts') {
    for (const p of i.prompts) await user.click(screen.getByRole('button', { name: p.action }));
  } else if (i?.type === 'play' || i?.type === 'hobby') {
    await user.click(screen.getByRole('button', { name: '여기까지만 할래' }));
  } else {
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
  }
}

describe('콘텐츠 전수 검사', () => {
  it('콘텐츠 수: PLAY 17 · HOBBY 16 · REST 17 · EXPERIENCE 20 · OUT 26 = 96', () => {
    const n = (c: CategoryId) => ALL.filter((e) => e.categoryId === c).length;
    expect([n('play'), n('hobby'), n('rest'), n('experience'), n('out')]).toEqual([17, 16, 17, 20, 26]);
    expect(ALL).toHaveLength(96);
  });

  it('id 중복·빈 제목·잘못된 카테고리·잘못된 시간·잘못된 엔진·깨진 장면이 없다', () => {
    expect(new Set(ALL.map((e) => e.id)).size).toBe(ALL.length);
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const e of ALL) {
      expect(e.title.trim(), e.id).not.toBe('');
      expect(cats.has(e.categoryId), e.id).toBe(true);
      expect(Number.isInteger(e.minutes) && e.minutes >= 1 && e.minutes <= 60, `${e.id} ${e.minutes}`).toBe(true);
      expect(ENGINES[e.categoryId], `${e.id} → ${engineOf(e)}`).toContain(engineOf(e));
      expect(e.steps.length, e.id).toBeGreaterThan(0);
      expect(e.moods.length, e.id).toBeGreaterThan(0);
    }
    expect(validateStories(STORIES)).toEqual([]);
  });

  it('사용자에게 보이는 콘텐츠에 임시 문구가 없다', () => {
    const text = JSON.stringify(ALL) + JSON.stringify(STORIES);
    expect(text).not.toMatch(/TODO|FIXME|lorem|dummy|placeholder|sample|COMING SOON|준비 ?중|테스트 콘텐츠/i);
  });

  it.each(CATEGORIES.map((c) => c.id))('%s: 모든 콘텐츠가 상세 → 시작 → 엔진 → 완료 → 기록까지 간다', async (cat) => {
    const user = userEvent.setup();
    for (const e of ALL.filter((x) => x.categoryId === cat)) {
      localStorage.clear();
      const router = renderAt(`/app/experience/${e.id}`);
      await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
      expect(router.state.location.pathname, e.id).toBe(`/app/experience/${e.id}/play`);
      await complete(user, e);
      expect(router.state.location.pathname, e.id).toBe(`/app/experience/${e.id}/done`);
      expect(getRecords()[0], e.id).toMatchObject({ experienceId: e.id, categoryId: cat, title: e.title });
    }
  }, 120_000);
});

describe('추천 연결 검사', () => {
  it('모든 상태 × 시간: 추천 후보는 실제 콘텐츠이고 시간 조건을 넘지 않는다', () => {
    for (const m of MOODS)
      for (const d of DURATIONS) {
        const c = candidatesFor(m.id, d);
        expect(c.length, `${m.id} ${d.id}`).toBeGreaterThan(0);
        for (const e of c) {
          expect(getExperience(e.id)).toBe(e);
          if (d.minutes !== null) expect(e.minutes, `${m.id} ${d.id} ${e.id}`).toBeLessThanOrEqual(d.minutes);
        }
        for (let seed = 1; seed <= 20; seed++) {
          const rec = recommendExperience({ mood: m.id, duration: d, random: seededRandom(seed) });
          expect(rec && getExperience(rec.experience.id), `${m.id} ${d.id}`).toBeTruthy();
        }
      }
  });

  it('상태별 우선 카테고리: 쉬고 싶어·자기 전 → REST, 놀고 싶어 → PLAY, 밖에 → OUT, 새로운 걸 → HOBBY·EXPERIENCE', () => {
    const cats = (mood: Parameters<typeof candidatesFor>[0]) => new Set(candidatesFor(mood, DURATIONS.at(-1)!).map((e) => e.categoryId));
    expect([...cats('rest')]).toEqual(['rest']);
    expect([...cats('bedtime')]).toEqual(['rest']);
    expect([...cats('play')]).toEqual(['play']);
    expect([...cats('out')]).toEqual(['out']);
    expect([...cats('new')].sort()).toEqual(['experience', 'hobby']);
  });

  it('아무거나: 한 카테고리에 갇히지 않는다 (5종류 모두 나온다)', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++)
      seen.add(recommendExperience({ mood: 'anything', duration: DURATIONS.at(-1)!, random: seededRandom(seed) })!.experience.categoryId);
    expect(seen.size).toBe(5);
  });

  it('지금 딱 하나 · 오늘의 OFFROU · 작은 코스(20·30·60분 × 모든 분위기)도 실제 콘텐츠만', () => {
    for (const e of instantCandidates()) {
      expect(getExperience(e.id)).toBe(e);
      expect(e.minutes).toBeLessThanOrEqual(15);
    }
    for (let d = 0; d < 60; d++) {
      const date = new Date(2026, 9, 1 + d);
      const a = pickDaily({ date });
      expect(a && getExperience(a.id)).toBeTruthy();
      expect(pickDaily({ date })!.id).toBe(a!.id); // 같은 날은 같은 콘텐츠
    }
    for (const minutes of COURSE_MINUTES)
      for (const v of COURSE_VIBES)
        for (let seed = 1; seed <= 10; seed++) {
          const c = generateCourse({ minutes, vibe: v.id, random: seededRandom(seed) });
          if (!c) continue;
          const { min, max } = courseBounds(minutes);
          for (const id of c.stepIds) expect(getExperience(id), id).toBeTruthy();
          expect(c.totalMinutes).toBeGreaterThanOrEqual(min);
          expect(c.totalMinutes).toBeLessThanOrEqual(max);
        }
  });
});

describe('죽은 링크 · 오류 처리', () => {
  const internalLinks = () =>
    [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')!).filter((h) => h.startsWith('/'));

  it('HOME · 발견(모든 카테고리) · MY(모든 탭) · 홈페이지의 내부 링크가 모두 실제 화면으로 간다', async () => {
    const hrefs = new Set<string>();
    for (const path of ['/app', '/app/discover', ...CATEGORIES.map((c) => `/app/discover/${c.id}`), '/app/my', '/app/my?tab=saved', '/app/my?tab=courses', '/app/my?tab=recent', '/app/support', '/app/support/mine']) {
      renderAt(path);
      internalLinks().forEach((h) => hrefs.add(h));
    }
    renderAt('/');
    await screen.findByRole('heading', { level: 1, name: '같은 하루에, 다른 시간을.' }, { timeout: 8000 });
    internalLinks().forEach((h) => hrefs.add(h));
    expect(hrefs.size).toBeGreaterThan(10);
    for (const href of hrefs) {
      const target = href.split(/[?#]/)[0];
      const router = renderAt(href);
      // 잘못된 주소는 '/'·'/app'으로 되돌아가므로, 도착한 경로가 링크와 같아야 한다
      expect(router.state.location.pathname, href).toBe(target);
    }
  });

  it('없는 콘텐츠·잘못된 주소·잘못된 코스는 앱을 멈추지 않고 안전한 화면으로', () => {
    expect(renderAt('/app/experience/nope').state.location.pathname).toBe('/app/discover');
    expect(renderAt('/app/experience/nope/play').state.location.pathname).toBe('/app');
    expect(renderAt('/app/experience/nope/done').state.location.pathname).toBe('/app');
    expect(renderAt('/app/what').state.location.pathname).toBe('/app');
    expect(renderAt('/nothing-here').state.location.pathname).toBe('/');
    renderAt('/app/course?cmin=20&cvibe=calm&csteps=nope,also-nope');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    renderAt('/app/ready?mood=zzz&time=1y');
    expect(screen.getByText('어떤 시간이 필요한지 먼저 골라줘.')).toBeInTheDocument();
  });

  it('화면 오류가 나도 하얀 화면 대신 안내 (오류 코드·HOME·문제 알려주기)', () => {
    const e = getExperience('play-three-words')!;
    const original = e.interaction;
    // 엔진이 처리하지 못하는 데이터로 일부러 오류를 낸다
    e.interaction = { type: 'prompts', prompts: null as never };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      renderAt('/app/experience/play-three-words/play');
      expect(screen.getByRole('alert')).toHaveTextContent('잠깐 문제가 생겼어.');
      expect(screen.getByText(/기록과 저장한 시간은 그대로 있어/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'HOME으로' })).toHaveAttribute('href', '/app');
      expect(screen.getByRole('link', { name: '문제 알려주기' }).getAttribute('href')).toMatch(/^\/app\/support\?type=bug&code=E-/);
      expect(screen.getByText(/오류 코드 E-\w+ · v\d/)).toBeInTheDocument();
    } finally {
      e.interaction = original;
      spy.mockRestore();
    }
  });

  it('빈 상태는 안내로 (검색 결과 없음 · 저장 없음 · 기록 없음 · 최근 본 없음)', async () => {
    const user = userEvent.setup();
    renderAt('/app/discover');
    await user.type(screen.getByRole('searchbox'), 'zzzqqq');
    expect(await screen.findByRole('heading', { name: '그런 시간은 아직 준비하지 못했어.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '검색·필터 지우기' })).toBeInTheDocument();
    renderAt('/app/my');
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/아직/);
    renderAt('/app/my?tab=saved');
    expect(screen.getByRole('tabpanel').textContent).not.toBe('');
    renderAt('/app/my?tab=recent');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('아직 열어본 시간이 없어');
  });

  it('앱 코드에 사용자에게 보이는 임시 문구가 없다 (정직한 "준비 중" 표시 제외)', () => {
    const walk = (dir: string): string[] =>
      readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((d) =>
        d.isDirectory() ? walk(`${dir}/${d.name}`) : /\.tsx?$/.test(d.name) ? [`${dir}/${d.name}`] : [],
      );
    for (const f of walk('src').filter((x) => !x.startsWith('src/test/'))) {
      const src = readFileSync(join(process.cwd(), f), 'utf8');
      expect(src, f).not.toMatch(/lorem ipsum|dummy data|COMING SOON|>\s*TODO/i);
    }
  });
});

describe('저장·MY·코스', () => {
  it('카테고리마다 저장 → MY 저장한 시간 → 다시 실행', async () => {
    const user = userEvent.setup();
    for (const id of ['play-memory-5s', 'hobby-one-card', 'rest-just-here', 'exp-observatory', 'out-bench']) {
      renderAt(`/app/experience/${id}`);
      await user.click(screen.getByRole('button', { name: /저장/ }));
    }
    for (const id of ['play-memory-5s', 'hobby-one-card', 'rest-just-here', 'exp-observatory', 'out-bench']) {
      const router = renderAt('/app/my?tab=saved');
      await user.click(within(screen.getByRole('tabpanel')).getByRole('link', { name: new RegExp(getExperience(id)!.title) }));
      await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
      expect(router.state.location.pathname).toBe(`/app/experience/${id}/play`);
    }
  });

  it('코스 저장 → MY 저장한 코스 → 다시 실행', async () => {
    const user = userEvent.setup();
    renderAt('/app/course?cmin=20&cvibe=any&csteps=rest-just-here,hobby-color-combo,play-small-choice');
    await user.click(screen.getByRole('button', { name: /코스 저장/ }));
    const router = renderAt('/app/my?tab=courses');
    await user.click(within(screen.getByRole('tabpanel')).getAllByRole('link')[0]);
    expect(router.state.location.pathname).toBe('/app/course');
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe('/app/experience/rest-just-here/play');
  });
});
