import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '@/app/router';
import { STORIES } from '@/data/stories';
import type { InteractiveStory } from '@/types/story';
import {
  allPlaythroughs,
  currentSceneId,
  findScene,
  resolveEnding,
  storyLength,
  validateStories,
  validateStory,
} from '@/features/experience/story/engine';
import { getExperience, getStory, listExperiences } from '@/services/experiences';
import { getRecords } from '@/services/records';
import { EMPTY_FILTER, searchExperiences } from '@/services/discovery';
import { candidatesFor, instantCandidates, pickDaily, recommendExperience, seededRandom } from '@/services/recommendation';
import { generateCourse } from '@/services/course';
import { findDuration } from '@/data/durations';
import { setBackendForTesting } from '@/services/account/backend';
import { FakeServer } from './fakeBackend';

const renderAt = (path: string) => {
  cleanup();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};
type User = ReturnType<typeof userEvent.setup>;
const play = (id: string) => `/app/experience/${id}/play`;
const NEW_IDS = [
  'exp-last-screening', 'exp-dawn-store', 'exp-magazine-editor', 'exp-photographer', 'exp-observatory',
  'exp-book-designer', 'exp-plant-shop', 'exp-alley-bakery', 'exp-small-stage', 'exp-city-guide',
];
const OLD_IDS = [
  'exp-bookstore', 'exp-radio-dj', 'exp-small-hotel', 'exp-detective', 'exp-strange-city',
  'exp-last-cafe', 'exp-flower-shop', 'exp-night-train', 'exp-museum-night', 'exp-postman',
];

/** 화면에서 매번 choiceIndex번째(없으면 첫) 선택지를 골라 결말까지 */
async function playThrough(user: User, story: InteractiveStory, choiceIndex: number) {
  await user.click(screen.getByRole('button', { name: '시작하기' }));
  const titles: string[] = [];
  for (let i = 0; i < 12; i++) {
    const title = screen.getByRole('heading', { level: 2 }).textContent!;
    titles.push(title);
    // 같은 제목의 장면이 여럿일 수 있어, 지금 화면에 보이는 선택지로 장면을 정한다
    const scene = story.scenes.find(
      (s) => s.title === title && (s.isEnding || (s.choices ?? []).every((c) => screen.queryByRole('button', { name: c.label }))),
    )!;
    if (scene.isEnding) break;
    const choices = scene.choices ?? [];
    const pick = choices[Math.min(choiceIndex, choices.length - 1)];
    await user.click(screen.getByRole('button', { name: pick?.label ?? '다음' }));
  }
  return titles;
}

const base: InteractiveStory = {
  experienceId: 'exp-test',
  title: '테스트',
  subtitle: '',
  introduction: '',
  estimatedMinutes: 5,
  start: 'a',
  completionMessage: '끝',
  scenes: [
    { id: 'a', title: 'A', description: '', choices: [{ label: '1', next: 'b', flag: 'x' }, { label: '2', next: 'b' }] },
    { id: 'b', title: 'B', description: '', isEnding: true },
  ],
  endings: [{ id: 'x', when: ['x'], title: 'X', message: '' }, { id: 'd', title: 'D', message: '' }],
};

afterEach(() => setBackendForTesting(undefined));

describe('ExperienceEngine 검증', () => {
  it('올바른 이야기는 오류가 없다', () => {
    expect(validateStory(base)).toEqual([]);
  });

  it('시작 장면 없음 · 없는 다음 장면 · 장면 id 중복 · 막다른 장면을 찾는다', () => {
    expect(validateStory({ ...base, start: 'zz' }).join()).toMatch(/시작 장면 없음/);
    expect(validateStory({ ...base, scenes: [{ ...base.scenes[0], choices: [{ label: '1', next: 'nope' }] }, base.scenes[1]] }).join()).toMatch(/없는 장면 nope/);
    expect(validateStory({ ...base, scenes: [...base.scenes, base.scenes[1]] }).join()).toMatch(/장면 id 중복/);
    expect(validateStory({ ...base, scenes: [base.scenes[0], { id: 'b', title: 'B', description: '' }] }).join()).toMatch(/다음 장면이 없음/);
  });

  it('되돌아가는 고리 · 닿을 수 없는 장면 · 결말 id 중복 · 고를 수 없는 결말 조건 · 기본 결말 누락', () => {
    const loop = { ...base, scenes: [base.scenes[0], { id: 'b', title: 'B', description: '', choices: [{ label: '다시', next: 'a' }] }] };
    expect(validateStory(loop).join()).toMatch(/되돌아가는 고리/);
    expect(validateStory({ ...base, scenes: [...base.scenes, { id: 'c', title: 'C', description: '', isEnding: true }] }).join()).toMatch(/닿을 수 없는 장면: c/);
    expect(validateStory({ ...base, endings: [...base.endings, { id: 'd', title: 'D2', message: '' }] }).join()).toMatch(/결말 id 중복/);
    expect(validateStory({ ...base, endings: [{ id: 'y', when: ['nope'], title: 'Y', message: '' }, base.endings[1]] }).join()).toMatch(/고를 수 없는 조건/);
    expect(validateStory({ ...base, endings: [base.endings[0]] }).join()).toMatch(/기본 결말 없음/);
  });

  it('여러 이야기의 경험 id 중복을 찾는다', () => {
    expect(validateStories([base, base]).join()).toMatch(/경험 id 중복: exp-test/);
  });

  it('잘못된 장면이 있어도 앱이 멈추지 않고 안내 + 마치기', async () => {
    const user = userEvent.setup();
    const story = getStory('exp-observatory')!;
    const original = story.scenes[0].choices;
    story.scenes[0].choices = [{ label: '어디로?', next: 'missing-scene' }];
    try {
      const router = renderAt(play('exp-observatory'));
      await user.click(screen.getByRole('button', { name: '시작하기' }));
      await user.click(screen.getByRole('button', { name: '어디로?' }));
      expect(screen.getByText('이야기가 잠깐 길을 잃었어.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '여기서 마치기' }));
      expect(router.state.location.pathname).toBe('/app/experience/exp-observatory/done');
    } finally {
      story.scenes[0].choices = original;
    }
  });
});

describe('EXPERIENCE 20개', () => {
  it('20개 모두 로딩 · 데이터 오류 없음 · 기존 10개 id 유지', () => {
    expect(STORIES).toHaveLength(20);
    expect(validateStories(STORIES)).toEqual([]);
    for (const id of [...OLD_IDS, ...NEW_IDS]) {
      expect(getStory(id), id).toBeDefined();
      expect(getExperience(id)?.interaction).toEqual({ type: 'story', storyId: id });
    }
    expect(listExperiences().filter((e) => e.categoryId === 'experience')).toHaveLength(20);
  });

  it('20개 모두: 5장면 이상 · 5~15분 · 모든 진행이 결말에 닿고 · 선택에 따라 결말이 2개 이상 달라진다', () => {
    for (const s of STORIES) {
      expect(s.scenes.length, s.experienceId).toBeGreaterThanOrEqual(5);
      expect(s.estimatedMinutes).toBeGreaterThanOrEqual(5);
      expect(s.estimatedMinutes).toBeLessThanOrEqual(15);
      const plays = allPlaythroughs(s);
      for (const p of plays) expect(findScene(s, currentSceneId(p))?.isEnding, `${s.experienceId} ${p.path.join('>')}`).toBe(true);
      const endings = new Set(plays.map((p) => resolveEnding(s, p.flags)?.id));
      expect(endings.size, s.experienceId).toBeGreaterThanOrEqual(2);
    }
  });

  it('새 10개는 장면 경로 자체가 갈라진다 (다른 선택 → 다른 다음 장면)', () => {
    for (const id of NEW_IDS) {
      const paths = new Set(allPlaythroughs(getStory(id)!).map((p) => p.path.join('>')));
      expect(paths.size, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('시간 표시는 실제 길이로: 5분짜리도 있다 (5분 사용자에게 15분을 주지 않음)', () => {
    const five = candidatesFor('new', findDuration('5m')!).filter((e) => e.categoryId === 'experience');
    expect(five.map((e) => e.id).sort()).toEqual(['exp-book-designer', 'exp-dawn-store', 'exp-photographer']);
    expect(five.every((e) => e.minutes <= 5)).toBe(true);
  });

  it('안전한 소재 · 점수/실패/엔딩 수집 없음', () => {
    const text = JSON.stringify(STORIES);
    expect(text).not.toMatch(/자살|자해|살인|피가|칼로|폭행|GAME OVER|실패|점수|별점|랭킹|엔딩 수집|발견한 엔딩|XP/);
  });
});

describe('실제 진행 · 분기', () => {
  it('도시 안내자: 시장을 고르면 시장 장면, 공원을 고르면 공원 장면', async () => {
    const user = userEvent.setup();
    renderAt(play('exp-city-guide'));
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    expect(screen.getByRole('img', { name: `1 / ${storyLength(getStory('exp-city-guide')!)}` })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '아침 시장' }));
    expect(screen.getByRole('heading', { level: 2, name: '아침 시장' })).toBeInTheDocument();

    renderAt(play('exp-city-guide'));
    // 방금 진행이 남아 있으므로 (16단계 이어하기) 처음부터 다시
    await user.click(screen.getByRole('button', { name: '처음부터' }));
    await user.click(screen.getByRole('button', { name: '언덕 위 공원' }));
    expect(screen.getByRole('heading', { level: 2, name: '언덕 위 공원' })).toBeInTheDocument();
  });

  it.each(NEW_IDS)('%s: 첫 선택과 둘째 선택으로 끝까지 — 지나는 장면 또는 결말이 다르다', async (id) => {
    const user = userEvent.setup();
    const story = getStory(id)!;
    renderAt(play(id));
    const a = await playThrough(user, story, 0);
    const endingA = screen.getByText('오늘의 이야기').nextElementSibling?.textContent;
    renderAt(play(id));
    const b = await playThrough(user, story, 1);
    const endingB = screen.getByText('오늘의 이야기').nextElementSibling?.textContent;
    expect(a.join('>') !== b.join('>') || endingA !== endingB).toBe(true);
  });

  it('완료 → MY 기록(결말 포함) → "다른 선택으로 다시 해볼래"는 선택지일 뿐', async () => {
    const user = userEvent.setup();
    const story = getStory('exp-dawn-store')!;
    const router = renderAt(play('exp-dawn-store'));
    await playThrough(user, story, 0);
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    expect(router.state.location.pathname).toBe('/app/experience/exp-dawn-store/done');
    expect(getRecords()[0]).toMatchObject({ experienceId: 'exp-dawn-store', kind: 'story', categoryId: 'experience' });
    expect(getRecords()[0].endingTitle).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/d+개 중|개 발견|엔딩 수집/);
    await user.click(screen.getByRole('button', { name: '다른 선택으로 다시 해볼래' }));
    expect(router.state.location.pathname).toBe('/app/experience/exp-dawn-store/play');
    expect(screen.getByRole('button', { name: '시작하기' })).toBeInTheDocument();
  });

  it('중간에 나가기 → 그냥 나가기는 기록 없음 (실패 아님)', async () => {
    const user = userEvent.setup();
    renderAt('/app/experience/exp-bakery-none');
    const router = renderAt(play('exp-alley-bakery'));
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    await user.click(screen.getByRole('button', { name: /크루아상/ }));
    await user.click(screen.getByRole('button', { name: /나가기/ }));
    await user.click(screen.getByRole('button', { name: '그냥 나가기' }));
    expect(router.state.location.pathname).toBe('/app/experience/exp-alley-bakery');
    expect(getRecords()).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/실패/);
  });
});

describe('연결: 저장 · 발견 · 검색 · 추천 · 코스 · 계정', () => {
  it('저장 → MY 저장한 시간', async () => {
    const user = userEvent.setup();
    renderAt('/app/experience/exp-observatory');
    await user.click(screen.getByRole('button', { name: /저장/ }));
    renderAt('/app/my?tab=saved');
    expect(screen.getByText('한밤의 천문대')).toBeInTheDocument();
  });

  it('발견 → EXPERIENCE 20개 탐색 (더 보기)', async () => {
    const user = userEvent.setup();
    renderAt('/app/discover/experience');
    for (let i = 0; i < 5; i++) {
      const more = screen.queryByRole('button', { name: /더 보기/ });
      if (!more) break;
      await user.click(more);
    }
    for (const id of [...OLD_IDS, ...NEW_IDS]) expect(screen.getByRole('link', { name: new RegExp(getExperience(id)!.title) })).toBeInTheDocument();
  });

  it('검색: 제목 · 설명 · 태그로 찾는다', () => {
    const ids = (q: string) => searchExperiences({ ...EMPTY_FILTER, q }).map((e) => e.id);
    expect(ids('천문대')).toContain('exp-observatory');
    expect(ids('표지')).toContain('exp-book-designer');
    expect(ids('새벽')).toContain('exp-dawn-store');
  });

  it('새로운 걸 해보고 싶어 · 아무거나 · 지금 딱 하나 · 오늘의 OFFROU에서 나온다', () => {
    const isNew = (id?: string) => !!id && NEW_IDS.includes(id);
    const hits = (fn: (r: () => number) => string | undefined) => {
      for (let seed = 1; seed < 500; seed++) if (isNew(fn(seededRandom(seed)))) return true;
      return false;
    };
    expect(hits((random) => recommendExperience({ mood: 'new', duration: findDuration('10m')!, random })?.experience.id)).toBe(true);
    expect(hits((random) => recommendExperience({ mood: 'anything', duration: findDuration('any')!, random })?.experience.id)).toBe(true);
    expect(instantCandidates().some((e) => e.categoryId === 'experience')).toBe(true);
    let found = false;
    for (let d = 0; d < 200 && !found; d++) found = getExperience(pickDaily({ date: new Date(2026, 9, 1 + d) })?.id ?? '')?.categoryId === 'experience';
    expect(found).toBe(true);
    expect(hits((random) => generateCourse({ minutes: 30, vibe: 'new', random })?.stepIds.find(isNew))).toBe(true);
  });

  it('작은 코스: REST → EXPERIENCE → PLAY, 결말 뒤 다음 시간으로', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/course?cmin=20&cvibe=any&csteps=rest-just-here,exp-dawn-store,play-small-choice');
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    await user.click(screen.getByRole('button', { name: '다음 시간으로' }));
    expect(router.state.location.pathname).toBe('/app/experience/exp-dawn-store/play');
    await playThrough(user, getStory('exp-dawn-store')!, 1);
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    expect(screen.getByRole('heading', { name: '한 시간을 보냈어.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음 시간으로' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-small-choice/play');
  });

  it('비회원으로 바로 · 로그인 사용자는 결말까지 동기화', async () => {
    const user = userEvent.setup();
    setBackendForTesting(new FakeServer().createDevice());
    renderAt(play('exp-photographer'));
    expect(screen.queryByText(/로그인/)).not.toBeInTheDocument();

    localStorage.clear();
    const server = new FakeServer();
    const device = server.createDevice();
    await device.signUp('me@offrou.app', 'long-enough-1');
    setBackendForTesting(device);
    renderAt('/app/my');
    await screen.findByText('OFFROU가 이어지고 있어.');
    renderAt(play('exp-photographer'));
    await playThrough(user, getStory('exp-photographer')!, 0);
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    const id = server.userId('me@offrou.app')!;
    await vi.waitFor(() => expect(server.snapshotOf(id).records.map((r) => r.experienceId)).toContain('exp-photographer'), { timeout: 5000 });
    expect(server.snapshotOf(id).records[0]).toMatchObject({ kind: 'story' });
    expect(server.snapshotOf(id).records[0].endingTitle).toBeTruthy();
  });

  it('오프라인이어도 이야기는 처음부터 끝까지 (로컬 데이터)', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    try {
      const user = userEvent.setup();
      const router = renderAt(play('exp-book-designer'));
      await playThrough(user, getStory('exp-book-designer')!, 1);
      await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
      expect(router.state.location.pathname).toBe('/app/experience/exp-book-designer/done');
    } finally {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    }
  });

  it('HOME → 새로운 걸 해보고 싶어 → 10분 → EXPERIENCE → 시작 → 선택 → 결말 → 완료 → MY', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');
    await user.click(screen.getByRole('button', { name: /새로운 걸 해보고 싶어/ }));
    await user.click(screen.getByRole('button', { name: '10분' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    const pick = () => new URLSearchParams(router.state.location.search).get('pick')!;
    for (let i = 0; i < 25 && getExperience(pick())?.categoryId !== 'experience'; i++) await user.click(screen.getByRole('button', { name: /다른 시간 보기/ }));
    const id = pick();
    expect(getExperience(id)?.categoryId).toBe('experience');
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    await playThrough(user, getStory(id)!, 0);
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    expect(getRecords()[0]).toMatchObject({ experienceId: id, moodId: 'new', durationId: '10m', kind: 'story' });
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(within(screen.getByRole('tabpanel')).getAllByText(new RegExp(getExperience(id)!.title)).length).toBeGreaterThan(0);
  });
});

describe('접근성 · 회귀', () => {
  it('선택지는 버튼 · 키보드로 고를 수 있다', async () => {
    const user = userEvent.setup();
    renderAt(play('exp-plant-shop'));
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    const choice = screen.getByRole('button', { name: /창가로 화분을/ });
    expect(choice.tagName).toBe('BUTTON');
    choice.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { level: 2, name: '첫 손님' })).toBeInTheDocument();
  });

  it('PLAY · HOBBY · REST · HOME 6개 카드 · /app 그대로', () => {
    renderAt(play('play-three-words'));
    expect(screen.getByRole('region', { name: '바로 놀기' })).toBeInTheDocument();
    renderAt(play('hobby-one-card'));
    expect(screen.getByRole('region', { name: '취미 맛보기' })).toBeInTheDocument();
    renderAt(play('rest-just-here'));
    expect(screen.getByRole('button', { name: '여기 있을래' })).toBeInTheDocument();
    renderAt('/app');
    expect(within(screen.getByRole('group', { name: '지금 어떤 시간이 필요해?' })).getAllByRole('button')).toHaveLength(6);
  });
});
