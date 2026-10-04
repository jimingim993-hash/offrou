/// <reference types="node" />
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { routes } from '@/app/router';
import { HOBBY_PROGRAMS, getHobbyProgram } from '@/data/hobby/programs';
import {
  COLLAGE_PROMPTS,
  DRAWING_TOPICS,
  HANDWRITING_LINES,
  MUSIC_MISSIONS,
  NAMED_COLORS,
  PAPER_ACTIVITIES,
  PHOTO_THEMES,
  PLAYLIST_THEMES,
  WRITING_TOPICS,
} from '@/data/hobby/pools';
import { HOBBY_VIEWS } from '@/features/hobby/HobbyRunner';
import { getExperience, listExperiences } from '@/services/experiences';
import { getRecords } from '@/services/records';
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

const RUNNABLE = listExperiences().filter((e) => e.interaction?.type === 'hobby');
const play = (id: string) => `/app/experience/${id}/play`;
const region = () => screen.getByRole('region', { name: '취미 맛보기' });

/** 소개 화면 → 시작 */
async function start(user: ReturnType<typeof userEvent.setup>, id: string) {
  const router = renderAt(play(id));
  await user.click(within(region()).getByRole('button', { name: '시작' }));
  return router;
}

const ctx = {
  setTransform: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  stroke: vi.fn(), clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(),
  lineCap: '', lineJoin: '', lineWidth: 0, strokeStyle: '', fillStyle: '',
};
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});
afterEach(() => {
  vi.useRealTimers();
  setBackendForTesting(undefined);
});

const doneHere = (router: ReturnType<typeof renderAt>, id: string) =>
  expect(router.state.location.pathname).toBe(`/app/experience/${id}/done`);

describe('HobbyEngine · 데이터', () => {
  it('실행형 HOBBY 12개가 각자 경험·실행 화면과 연결된다', () => {
    expect(HOBBY_PROGRAMS).toHaveLength(12);
    for (const p of HOBBY_PROGRAMS) {
      expect(HOBBY_VIEWS[p.kind], p.id).toBeDefined();
      expect(RUNNABLE.some((e) => e.interaction?.type === 'hobby' && e.interaction.program === p.id), p.id).toBe(true);
    }
    expect(RUNNABLE).toHaveLength(12);
    expect(RUNNABLE.every((e) => e.categoryId === 'hobby' && e.minutes >= 5 && e.minutes <= 15)).toBe(true);
  });

  it('기존 HOBBY id 유지, 콘텐츠 수 유지·증가, 절반 이상은 준비물 없이', () => {
    for (const id of ['hobby-drawing', 'hobby-one-paragraph', 'hobby-photo-theme', 'hobby-new-genre', 'hobby-handwriting', 'hobby-paper-craft'])
      expect(getExperience(id)?.interaction?.type).toBe('hobby');
    expect(getExperience('hobby-new-word')?.interaction?.type).toBe('focus');
    expect(listExperiences().filter((e) => e.categoryId === 'hobby')).toHaveLength(16);
    expect(listExperiences().filter((e) => e.categoryId === 'play')).toHaveLength(17);
    expect(RUNNABLE.filter((e) => e.supplies.length === 0).length).toBeGreaterThanOrEqual(6);
  });

  it('콘텐츠 양: 드로잉 30+ · 글감 30+ · 사진 25+ · 음악 25+ · 손글씨 30+ · 종이 활동 3+', () => {
    expect(DRAWING_TOPICS.length).toBeGreaterThanOrEqual(30);
    expect(WRITING_TOPICS.length).toBeGreaterThanOrEqual(30);
    expect(PHOTO_THEMES.length).toBeGreaterThanOrEqual(25);
    expect(MUSIC_MISSIONS.length).toBeGreaterThanOrEqual(25);
    expect(HANDWRITING_LINES.length).toBeGreaterThanOrEqual(30);
    expect(PAPER_ACTIVITIES.length).toBeGreaterThanOrEqual(3);
    for (const pool of [DRAWING_TOPICS, WRITING_TOPICS, PHOTO_THEMES, MUSIC_MISSIONS, HANDWRITING_LINES, PLAYLIST_THEMES])
      expect(new Set(pool).size).toBe(pool.length);
    for (const a of PAPER_ACTIVITIES) {
      expect(a.supplies.length).toBeGreaterThan(0);
      expect(a.steps.length).toBeGreaterThanOrEqual(4);
    }
    // 색은 이름이 있다 (색만으로 정보를 주지 않음)
    for (const c of NAMED_COLORS) expect(c.name.length).toBeGreaterThan(0);
  });

  it('잘못된 프로그램 id → 기존 "오늘의 주제" 화면으로 안전하게', () => {
    expect(getHobbyProgram('nope')).toBeUndefined();
    const e = getExperience('hobby-color-combo')!;
    const original = e.interaction;
    e.interaction = { type: 'hobby', program: 'nope' as never };
    try {
      renderAt(play(e.id));
      expect(screen.getByRole('button', { name: '이 시간 마치기' })).toBeInTheDocument();
    } finally {
      e.interaction = original;
    }
    const r = renderAt(play('hobby-nope'));
    expect(r.state.location.pathname).toBe('/app');
  });

  it('소개 화면: 몇 분 · 준비물(없음 또는 필요한 것) · [시작]', () => {
    renderAt(play('hobby-handwriting'));
    expect(within(region()).getByText('5분만 해보기')).toBeInTheDocument();
    expect(within(region()).getByText('필요한 것: 종이 + 펜')).toBeInTheDocument();
    renderAt(play('hobby-color-combo'));
    expect(within(region()).getByText('준비물 없음 · 휴대폰만 있으면 돼')).toBeInTheDocument();
    expect(within(region()).getByRole('button', { name: '시작' })).toBeInTheDocument();
  });
});

describe('프로그램별: 시작 → 실제 행동 → 완료', () => {
  it('10분 드로잉 · 종이: 다른 주제 → 종이에 그릴래 → 다 그렸어', async () => {
    const user = userEvent.setup();
    const router = await start(user, 'hobby-drawing');
    const topic = () => DRAWING_TOPICS.find((t) => screen.queryByText(t));
    const first = topic();
    expect(first).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '다른 주제' }));
    expect(topic()).not.toBe(first);
    await user.click(screen.getByRole('button', { name: '종이에 그릴래' }));
    expect(screen.getByText('필요한 것: 종이 + 연필이나 펜')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /타이머 켜기 · 10분/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다 그렸어' }));
    doneHere(router, 'hobby-drawing');
    expect(screen.getByText('한 물건을 이렇게 오래 본 건 처음일지도 몰라.')).toBeInTheDocument();
  });

  it('10분 드로잉 · 화면: PLAY 공통 캔버스로 그리기 → 지우기 → 완료 (저장 안 함)', async () => {
    const user = userEvent.setup();
    const router = await start(user, 'hobby-drawing');
    await user.click(screen.getByRole('button', { name: '화면에 그릴래' }));
    const canvas = screen.getByRole('img', { name: /낙서하는 캔버스/ });
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 5, clientY: 5 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 30, clientY: 40 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(ctx.stroke).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '전체 지우기' }));
    expect(screen.getByRole('img', { name: /아직 비어 있어/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다 그렸어' }));
    doneHere(router, 'hobby-drawing');
    expect(JSON.stringify({ ...localStorage })).not.toMatch(/data:image/);
  });

  it('5분 글쓰기: 입력 없이도 완료 · 쓴 글은 저장되지 않는다', async () => {
    const user = userEvent.setup();
    let router = await start(user, 'hobby-one-paragraph');
    const topic = () => WRITING_TOPICS.find((t) => screen.queryByText(t));
    const first = topic();
    await user.click(screen.getByRole('button', { name: '다른 주제' }));
    expect(topic()).not.toBe(first);
    await user.click(screen.getByRole('button', { name: '다 썼어' }));
    doneHere(router, 'hobby-one-paragraph');

    router = await start(user, 'hobby-one-paragraph');
    await user.type(screen.getByLabelText(/저장되지 않아/), '창밖에 비가 왔다');
    await user.click(screen.getByRole('button', { name: '다 썼어' }));
    doneHere(router, 'hobby-one-paragraph');
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain('창밖에 비가 왔다');
  });

  it('사진 취미: 카메라·업로드 없이 "찍었어"로 완료', async () => {
    const user = userEvent.setup();
    const router = await start(user, 'hobby-photo-theme');
    expect(screen.getByText(/^오늘은 .+을\(를\) 찾아봐\.$/)).toBeInTheDocument();
    expect(screen.getByText('사진은 네 휴대폰에만 남아. OFFROU로 올라가지 않아.')).toBeInTheDocument();
    expect(document.querySelector('input[type=file]')).toBeNull();
    await user.click(screen.getByRole('button', { name: '다른 주제' }));
    await user.click(screen.getByRole('button', { name: '찍었어' }));
    doneHere(router, 'hobby-photo-theme');
  });

  it('음악 탐색: 다른 미션 → 찾았어 (재생·링크 없음)', async () => {
    const user = userEvent.setup();
    const router = await start(user, 'hobby-new-genre');
    const mission = () => MUSIC_MISSIONS.find((m) => screen.queryByText(m));
    const first = mission();
    await user.click(screen.getByRole('button', { name: '다른 미션' }));
    expect(mission()).not.toBe(first);
    expect(document.querySelector('audio, video, iframe, a[href^="http"]')).toBeNull();
    await user.click(screen.getByRole('button', { name: '찾았어' }));
    doneHere(router, 'hobby-new-genre');
  });

  it('손글씨: OFFROU 문장 · 다른 문장 → 써봤어', async () => {
    const user = userEvent.setup();
    const router = await start(user, 'hobby-handwriting');
    const line = () => HANDWRITING_LINES.find((l) => screen.queryByText(l));
    const first = line();
    expect(first).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '다른 문장' }));
    expect(line()).not.toBe(first);
    await user.click(screen.getByRole('button', { name: '써봤어' }));
    doneHere(router, 'hobby-handwriting');
  });

  it('종이 활동: 고르기 → 준비물 → 단계 이동(다음·이전) → 다 만들었어', async () => {
    const user = userEvent.setup();
    const router = await start(user, 'hobby-paper-craft');
    const group = screen.getByRole('group', { name: '종이 활동 고르기' });
    expect(within(group).getAllByRole('button')).toHaveLength(PAPER_ACTIVITIES.length);
    await user.click(within(group).getByRole('button', { name: '종이 부채' }));
    const fan = PAPER_ACTIVITIES.find((a) => a.id === 'fan')!;
    for (const s of fan.supplies) expect(within(screen.getByRole('list', { name: '준비물' })).getByText(s)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '준비됐어' }));
    expect(screen.getByText(`종이 부채 · 1 / ${fan.steps.length}`)).toBeInTheDocument();
    expect(screen.getByText(fan.steps[0])).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText(fan.steps[1])).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '이전' }));
    expect(screen.getByText(fan.steps[0])).toBeInTheDocument();
    for (let i = 1; i < fan.steps.length; i++) await user.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText(fan.steps.at(-1)!)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다 만들었어' }));
    doneHere(router, 'hobby-paper-craft');
  });

  it('콜라주: 좋아하는 색 · 먹고 싶은 것 · 가고 싶은 곳 하나씩 → 다 골랐어 (업로드 없음)', async () => {
    const user = userEvent.setup();
    const router = await start(user, 'hobby-collage-idea');
    const list = screen.getByRole('list', { name: '고를 사진' });
    for (const p of COLLAGE_PROMPTS.slice(0, 3)) expect(within(list).getByText(new RegExp(p))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다 골랐어' })).not.toBeInTheDocument();
    for (const n of [1, 2, 3]) await user.click(screen.getByRole('button', { name: `${n}번째 골랐어` }));
    expect(within(list).getAllByText('(골랐어)')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: '다 골랐어' }));
    doneHere(router, 'hobby-collage-idea');
  });

  it('관찰 스케치: 30초 관찰 → 특징 세 가지 → 그리기 (단계 1/3 → 3/3)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const router = await start(user, 'hobby-observe-sketch');
    expect(screen.getByText('1 / 3 단계')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '30초 관찰 시작' }));
    expect(screen.getByRole('timer')).toHaveTextContent('0:30');
    await vi.advanceTimersByTimeAsync(31_000);
    expect(screen.getByText('2 / 3 단계')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '떠올렸어' }));
    expect(screen.getByText('3 / 3 단계')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '화면에 그릴래' }));
    expect(screen.getByRole('img', { name: /낙서하는 캔버스/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다 그렸어' }));
    doneHere(router, 'hobby-observe-sketch');
  });

  it('짧은 이야기: 랜덤 소재 3개(PLAY 공통 랜덤) · 다른 소재 → 다 썼어', async () => {
    const user = userEvent.setup();
    const router = await start(user, 'hobby-short-story');
    const items = () => within(screen.getByRole('list', { name: '오늘의 소재' })).getAllByRole('listitem').map((li) => li.textContent);
    const first = items();
    expect(new Set(first).size).toBe(3);
    await user.click(screen.getByRole('button', { name: '다른 소재' }));
    expect(items().some((w) => first.includes(w))).toBe(false);
    await user.click(screen.getByRole('button', { name: '다 썼어' }));
    doneHere(router, 'hobby-short-story');
  });

  it('작은 플레이리스트: 1곡 → 2곡 → 3곡 → 완성 (곡 이름은 선택)', async () => {
    const user = userEvent.setup();
    const router = await start(user, 'hobby-mini-playlist');
    expect(PLAYLIST_THEMES.some((t) => screen.queryByText(t))).toBe(true);
    await user.type(screen.getByLabelText(/1번째 곡 이름/), '첫 곡');
    await user.click(screen.getByRole('button', { name: '1곡 골랐어' }));
    expect(within(screen.getByRole('list', { name: '고른 곡' })).getByText(/첫 곡/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '2곡 골랐어' }));
    await user.click(screen.getByRole('button', { name: '3곡 골랐어' }));
    await user.click(screen.getByRole('button', { name: '완성' }));
    doneHere(router, 'hobby-mini-playlist');
    expect(JSON.stringify({ ...localStorage })).not.toContain('첫 곡');
  });

  it('색 조합: 이름 있는 색 세 개 → 오늘의 색 → 다시 고르기 → 마음에 들어', async () => {
    const user = userEvent.setup();
    const router = await start(user, 'hobby-color-combo');
    const group = screen.getByRole('group', { name: '색 고르기' });
    expect(screen.getByRole('button', { name: '오늘의 색 보기' })).toBeDisabled();
    for (const name of ['숲', '레몬', '바다']) await user.click(within(group).getByRole('button', { name: name }));
    expect(within(group).getByRole('button', { name: '숲' })).toHaveAttribute('aria-pressed', 'true');
    // 세 개가 차면 더 고를 수 없다
    expect(within(group).getByRole('button', { name: '모래' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '오늘의 색 보기' }));
    expect(screen.getByRole('list', { name: '오늘의 색: 숲, 레몬, 바다' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다시 고르기' }));
    await user.click(screen.getByRole('button', { name: '오늘의 색 보기' }));
    await user.click(screen.getByRole('button', { name: '마음에 들어' }));
    doneHere(router, 'hobby-color-combo');
    expect(document.body.textContent).not.toMatch(/점수|조화도|평가/);
  });

  it('한 장 디자인: 배경색 · 문장(직접 쓰기) · 정렬이 카드에 바로 반영 → 완성했어', async () => {
    const user = userEvent.setup();
    const router = await start(user, 'hobby-one-card');
    const card = () => screen.getByRole('figure', { name: '만든 카드 미리보기' });
    await user.click(screen.getByRole('button', { name: '밤하늘' }));
    expect(card()).toHaveStyle({ background: '#25304A' });
    const input = screen.getByLabelText(/직접 쓰기/);
    await user.clear(input);
    await user.type(input, '나의 카드');
    expect(within(card()).getByText('나의 카드')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '오른쪽' }));
    expect(card()).toHaveStyle({ textAlign: 'right' });
    expect(screen.getByRole('button', { name: '오른쪽' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: '완성했어' }));
    doneHere(router, 'hobby-one-card');
    expect(JSON.stringify({ ...localStorage })).not.toContain('나의 카드');
  });
});

describe('완료 · 기록 · 저장 · 계정', () => {
  it('완료 → MY 기록 (kind hobby) · 다시 실행해도 처음부터', async () => {
    const user = userEvent.setup();
    await start(user, 'hobby-handwriting');
    await user.click(screen.getByRole('button', { name: '써봤어' }));
    expect(getRecords()[0]).toMatchObject({ experienceId: 'hobby-handwriting', kind: 'hobby', categoryId: 'hobby' });
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(screen.getByText('손글씨 한 줄')).toBeInTheDocument();
    // 재실행
    renderAt(play('hobby-handwriting'));
    expect(within(region()).getByRole('button', { name: '시작' })).toBeInTheDocument();
  });

  it('중간에 "여기까지만 할래" → 실패 없이 완료 기록', async () => {
    const user = userEvent.setup();
    renderAt(play('hobby-paper-craft'));
    await user.click(screen.getByRole('button', { name: '여기까지만 할래' }));
    expect(getRecords()).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/실패|포기/);
  });

  it('저장: ♡ 저장 → MY 저장한 시간 → 시작 → HobbyEngine', async () => {
    const user = userEvent.setup();
    renderAt('/app/experience/hobby-one-card');
    await user.click(screen.getByRole('button', { name: /저장/ }));
    const router = renderAt('/app/my?tab=saved');
    await user.click(screen.getByRole('link', { name: /한 장 디자인/ }));
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe('/app/experience/hobby-one-card/play');
    expect(region()).toBeInTheDocument();
  });

  it('비회원: 로그인 없이 바로 해볼 수 있다', async () => {
    setBackendForTesting(new FakeServer().createDevice());
    const user = userEvent.setup();
    await start(user, 'hobby-new-genre');
    expect(screen.queryByText(/로그인/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '찾았어' }));
    expect(getRecords()).toHaveLength(1);
  });

  it('로그인 사용자: HOBBY 완료가 계정에 동기화된다 (kind hobby)', async () => {
    const server = new FakeServer();
    const device = server.createDevice();
    await device.signUp('me@offrou.app', 'long-enough-1');
    setBackendForTesting(device);
    const user = userEvent.setup();
    renderAt('/app/my');
    await screen.findByText('OFFROU가 이어지고 있어.');
    await start(user, 'hobby-handwriting');
    await user.click(screen.getByRole('button', { name: '써봤어' }));
    const id = server.userId('me@offrou.app')!;
    await vi.waitFor(() => expect(server.snapshotOf(id).records.map((r) => r.experienceId)).toContain('hobby-handwriting'), { timeout: 5000 });
    expect(server.snapshotOf(id).records[0].kind).toBe('hobby');
  });
});

describe('추천 · 코스 · 발견 연결', () => {
  const runnable = (id?: string) => !!id && getExperience(id)?.interaction?.type === 'hobby';
  const hits = (fn: (r: () => number) => string | undefined) => {
    for (let seed = 1; seed < 400; seed++) if (runnable(fn(seededRandom(seed)))) return true;
    return false;
  };

  it('새로운 걸 해보고 싶어 → 실행형 HOBBY (시간 조건 유지)', () => {
    const c = candidatesFor('new', findDuration('10m')!);
    expect(c.filter((e) => runnable(e.id)).length).toBeGreaterThanOrEqual(10);
    expect(c.every((e) => e.minutes <= 10)).toBe(true);
    expect(hits((random) => recommendExperience({ mood: 'new', duration: findDuration('10m')!, random })?.experience.id)).toBe(true);
  });

  it('아무거나 · 지금 딱 하나 · 오늘의 OFFROU에서도 나온다', () => {
    expect(hits((random) => recommendExperience({ mood: 'anything', duration: findDuration('any')!, random })?.experience.id)).toBe(true);
    expect(instantCandidates().filter((e) => runnable(e.id)).length).toBeGreaterThan(0);
    let found = false;
    for (let d = 0; d < 120 && !found; d++) found = runnable(pickDaily({ date: new Date(2026, 9, 1 + d) })?.id);
    expect(found).toBe(true);
  });

  it('작은 코스(새롭게) → HOBBY가 들어가고 코스 안에서 실행 → 다음 시간으로', async () => {
    expect(hits((random) => generateCourse({ minutes: 30, vibe: 'new', random })?.stepIds.find(runnable))).toBe(true);
    const user = userEvent.setup();
    const router = renderAt('/app/course?cmin=20&cvibe=new&csteps=hobby-color-combo,hobby-handwriting,hobby-collage-idea');
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe('/app/experience/hobby-color-combo/play');
    await user.click(within(region()).getByRole('button', { name: '시작' }));
    for (const name of ['숲', '레몬', '바다']) await user.click(screen.getByRole('button', { name }));
    await user.click(screen.getByRole('button', { name: '오늘의 색 보기' }));
    await user.click(screen.getByRole('button', { name: '마음에 들어' }));
    expect(screen.getByRole('heading', { name: '한 시간을 보냈어.' })).toBeInTheDocument();
    expect(getRecords()[0].courseRunId).toBeTruthy();
  });

  it('발견 → HOBBY: "바로 해보기" 표시 → 상세 → 시작', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/discover/hobby');
    expect(screen.getAllByText('바로 해보기').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('link', { name: /10분 드로잉/ }));
    await user.click(screen.getByRole('button', { name: /시작/ }));
    expect(router.state.location.pathname).toBe('/app/experience/hobby-drawing/play');
  });

  it('HOME → 새로운 걸 해보고 싶어 → 10분 → HOBBY 추천 → 시작 → HobbyEngine → 완료 → MY', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');
    await user.click(screen.getByRole('button', { name: /새로운 걸 해보고 싶어/ }));
    await user.click(screen.getByRole('button', { name: '10분' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    const pick = () => new URLSearchParams(router.state.location.search).get('pick')!;
    for (let i = 0; i < 15 && !runnable(pick()); i++) await user.click(screen.getByRole('button', { name: /다른 시간 보기/ }));
    const id = pick();
    expect(runnable(id)).toBe(true);
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(region()).toBeInTheDocument();
    await user.click(within(region()).getByRole('button', { name: '시작' }));
    await user.click(screen.getByRole('button', { name: '여기까지만 할래' }));
    expect(getRecords()[0]).toMatchObject({ experienceId: id, moodId: 'new', durationId: '10m', kind: 'hobby' });
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(screen.getAllByText(getExperience(id)!.title).length).toBeGreaterThan(0);
  });
});

describe('접근성 · 개인정보 · 철학', () => {
  it('모든 실행형 HOBBY: 의미 있는 button, 입력칸에는 label, 평가·게임 요소 없음', async () => {
    const user = userEvent.setup();
    for (const e of RUNNABLE) {
      await start(user, e.id);
      for (const b of within(region()).getAllByRole('button')) {
        expect(b.tagName).toBe('BUTTON');
        expect(b.textContent!.trim().length).toBeGreaterThan(0);
      }
      for (const field of document.querySelectorAll('textarea, input')) expect(field.id && document.querySelector(`label[for="${field.id}"]`), e.id).toBeTruthy();
      expect(document.body.textContent).not.toMatch(/점수|레벨|랭킹|포인트|좋아요|댓글|공유하기|결제|광고|잘했어요|못했/);
    }
  });

  it('키보드로 색 고르기', async () => {
    const user = userEvent.setup();
    await start(user, 'hobby-color-combo');
    const b = screen.getByRole('button', { name: '민트' });
    b.focus();
    await user.keyboard('{Enter}');
    expect(b).toHaveAttribute('aria-pressed', 'true');
  });

  it('업로드·카메라·마이크·음악 재생·서버 전송을 쓰지 않는다', () => {
    const dir = join(process.cwd(), 'src/features/hobby');
    const files = ['HobbyRunner.tsx', ...readdirSync(join(dir, 'programs')).map((f) => `programs/${f}`)];
    for (const f of files) {
      const src = readFileSync(join(dir, f), 'utf8');
      expect(src, f).not.toMatch(/getUserMedia|geolocation|toDataURL|toBlob|fetch\(|type="file"|<audio|<iframe|localStorage|writeJson/);
    }
  });

  it('다크모드: 카드·팔레트는 자기 색을 쓰고, 나머지는 테마 토큰을 따른다', () => {
    const css = readFileSync(join(process.cwd(), 'src/features/hobby/hobby.module.css'), 'utf8');
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i);
    for (const c of NAMED_COLORS) expect(c.ink).toMatch(/^#(FFFFFF|2B2620)$/);
  });
});
