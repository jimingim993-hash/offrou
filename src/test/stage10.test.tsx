import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { routes } from '@/app/router';
import { PLAY_PROGRAMS, getPlayProgram } from '@/data/play/programs';
import { CHOICES, COLORS, DRAW_TOPICS, MEMORY_ITEMS, PHOTO_MISSIONS, QUESTIONS, STORY_EMOJIS, WORDS } from '@/data/play/pools';
import { PLAY_VIEWS } from '@/features/play/PlayRunner';
import { getExperience, listExperiences } from '@/services/experiences';
import { getRecords } from '@/services/records';
import { candidatesFor, instantCandidates, pickDaily, recommendExperience } from '@/services/recommendation';
import { generateCourse } from '@/services/course';
import { findDuration } from '@/data/durations';
import { pickDistinct, pickOne } from '@/services/random';
import { seededRandom } from '@/services/recommendation';
import { setBackendForTesting } from '@/services/account/backend';
import { FakeServer } from './fakeBackend';

/// <reference types="node" />

const renderAt = (path: string) => {
  cleanup();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};

const RUNNABLE = listExperiences().filter((e) => e.interaction?.type === 'play');
const play = (id: string) => `/app/experience/${id}/play`;

/** 지금 보이는 큰 글자들 (랜덤 결과 비교용) */
const stageText = () => screen.getByRole('region', { name: '바로 놀기' }).textContent;

// jsdom에는 캔버스 그리기가 없어서 흉내 낸다
const ctx = {
  setTransform: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  lineCap: '',
  lineJoin: '',
  lineWidth: 0,
  strokeStyle: '',
  fillStyle: '',
};
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  for (const fn of Object.values(ctx)) if (typeof fn === 'function') (fn as ReturnType<typeof vi.fn>).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  setBackendForTesting(undefined);
});

describe('PLAY 엔진 · 데이터', () => {
  it('실행형 PLAY 프로그램 10개가 각자 경험·실행 화면과 연결된다', () => {
    expect(PLAY_PROGRAMS).toHaveLength(10);
    expect(new Set(PLAY_PROGRAMS.map((p) => p.id)).size).toBe(10);
    for (const p of PLAY_PROGRAMS) {
      expect(PLAY_VIEWS[p.kind], p.id).toBeDefined();
      expect(RUNNABLE.some((e) => e.interaction?.type === 'play' && e.interaction.program === p.id), p.id).toBe(true);
      expect(p.completionMessage).toBeTruthy();
    }
    expect(RUNNABLE.length).toBeGreaterThanOrEqual(10);
    expect(RUNNABLE.every((e) => e.categoryId === 'play')).toBe(true);
  });

  it('기존 PLAY 콘텐츠 id는 유지되고, 전체 콘텐츠는 줄지 않았다', () => {
    for (const id of ['play-color-hunt', 'play-three-words', 'play-doodle', 'play-small-question', 'play-photo-mission'])
      expect(getExperience(id)?.interaction?.type).toBe('play');
    // 실행형으로 바꾸지 않은 PLAY는 그대로
    expect(getExperience('play-shadow-puppets')?.interaction?.type).toBe('prompts');
    const byCat = (c: string) => listExperiences().filter((e) => e.categoryId === c).length;
    expect(byCat('play')).toBe(17);
    for (const c of ['rest', 'hobby', 'experience', 'out']) expect(byCat(c)).toBeGreaterThanOrEqual(10);
  });

  it('랜덤 재료: 충분한 양, 중복 없음, 민감한 단어 없음', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(WORDS).size).toBe(WORDS.length);
    expect(CHOICES.length).toBeGreaterThanOrEqual(30);
    expect(DRAW_TOPICS.length).toBeGreaterThanOrEqual(30);
    expect(PHOTO_MISSIONS.length).toBeGreaterThanOrEqual(30);
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(QUESTIONS).size).toBe(QUESTIONS.length);
    expect(STORY_EMOJIS.length).toBeGreaterThanOrEqual(20);
    expect(MEMORY_ITEMS.length).toBeGreaterThanOrEqual(15);
    for (const c of COLORS) expect(c.name).toMatch(/색$/);
    const all = JSON.stringify([WORDS, CHOICES, DRAW_TOPICS, PHOTO_MISSIONS, QUESTIONS]);
    expect(all).not.toMatch(/정치|대통령|죽|살인|섹스|술|담배|도박|돈을 잃|몰래|병원|우울|성격 유형/);
  });

  it('랜덤 공통: 한 번에 겹치지 않고, 다시 고르면 방금 것과 겹치지 않게', () => {
    const r = seededRandom(7);
    for (let i = 0; i < 50; i++) {
      const three = pickDistinct(WORDS, 3, r);
      expect(new Set(three).size).toBe(3);
      const next = pickDistinct(WORDS, 3, r, three);
      expect(next.some((w) => three.includes(w))).toBe(false);
      const one = pickOne(QUESTIONS, r);
      expect(pickOne(QUESTIONS, r, one)).not.toBe(one);
    }
    // 고를 게 하나뿐이면 그거라도
    expect(pickOne(['a'], r, 'a')).toBe('a');
  });

  it('잘못된 프로그램 id는 안내형 화면으로 안전하게', () => {
    expect(getPlayProgram('nope')).toBeUndefined();
    const e = getExperience('play-memory-5s')!;
    const original = e.interaction;
    e.interaction = { type: 'play', program: 'nope' as never };
    try {
      renderAt(play(e.id));
      expect(screen.getByRole('button', { name: '이 시간 마치기' })).toBeInTheDocument();
    } finally {
      e.interaction = original;
    }
  });

  it('없는 PLAY 주소·새로고침: 빈 화면 없이 안전한 화면', () => {
    const r = renderAt(play('play-nope'));
    expect(r.state.location.pathname).toBe('/app');
    // 진행 중 새로고침 = 같은 주소로 새로 열기 → 처음 화면부터 다시
    renderAt(play('play-three-words'));
    expect(screen.getByRole('region', { name: '바로 놀기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시작' })).toBeInTheDocument();
  });
});

describe('프로그램별: 시작 → 상호작용 → 완료', () => {
  it('랜덤 단어 3개: 다른 단어 → 시작 → 다 했어 → 완료 메시지·기록', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('play-three-words'));
    const words = () => within(screen.getByRole('list', { name: '오늘의 단어' })).getAllByRole('listitem').map((li) => li.textContent);
    const first = words();
    expect(new Set(first).size).toBe(3);
    await user.click(screen.getByRole('button', { name: '다른 단어' }));
    const second = words();
    expect(second.some((w) => first.includes(w))).toBe(false);
    await user.click(screen.getByRole('button', { name: '시작' }));
    expect(screen.getByText('세 단어가 모두 들어가는 이야기를 만들어봐.')).toBeInTheDocument();
    // 입력은 선택 — 쓰지 않아도 끝낼 수 있다
    expect(screen.getByLabelText(/저장되지 않아/)).toHaveValue('');
    await user.click(screen.getByRole('button', { name: '다 했어' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-three-words/done');
    expect(screen.getByRole('heading', { name: '잠깐 다른 시간을 보냈어.' })).toBeInTheDocument();
    expect(screen.getByText('평소에는 만나지 않았을 세 단어가 잠깐 같은 이야기에 있었네.')).toBeInTheDocument();
    expect(getRecords()[0]).toMatchObject({ experienceId: 'play-three-words', kind: 'play', categoryId: 'play' });
  });

  it('오늘의 작은 선택: 고르면 반응 → 다음 질문(다른 질문) → 여기까지', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('play-small-choice'));
    const group = () => screen.getByRole('group', { name: '둘 중 하나' });
    const firstPair = group().textContent;
    const [left] = within(group()).getAllByRole('button');
    expect(screen.queryByRole('button', { name: '다음 질문' })).not.toBeInTheDocument();
    await user.click(left);
    expect(left).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(/.+/);
    await user.click(screen.getByRole('button', { name: '다음 질문' }));
    expect(group().textContent).not.toBe(firstPair);
    expect(within(group()).getAllByRole('button')[0]).toHaveAttribute('aria-pressed', 'false');
    await user.click(within(group()).getAllByRole('button')[1]);
    await user.click(screen.getByRole('button', { name: '여기까지' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-small-choice/done');
    expect(document.body.textContent).not.toMatch(/정답입니다|틀렸|점수/);
  });

  it('색깔 찾기: 색 이름을 글자로 · 60초 시작 → 타이머 끝 → 몇 개 찾았어? → 완료', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const router = renderAt(play('play-color-hunt'));
    expect(screen.getByText(/^(노란색|파란색|빨간색|초록색|주황색|보라색|갈색|하얀색|검은색)을 찾아봐\.$/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '60초 시작' }));
    expect(screen.getByRole('timer')).toHaveTextContent('1:00');
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('0:30');
    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    expect(screen.getByText('몇 개 찾았어?')).toBeInTheDocument();
    for (const a of ['1개', '2개', '3개 이상']) expect(screen.getByRole('button', { name: a })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '1개' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-color-hunt/done');
    expect(screen.getByText('평소엔 지나쳤던 색이 조금 더 잘 보였을지도 몰라.')).toBeInTheDocument();
  });

  it('색깔 찾기: 타이머 없이 "그냥 찾을래" → 다 찾았어 → 어떤 답도 실패 없음', async () => {
    const user = userEvent.setup();
    renderAt(play('play-color-hunt'));
    const before = stageText();
    await user.click(screen.getByRole('button', { name: '다른 색' }));
    expect(stageText()).not.toBe(before);
    await user.click(screen.getByRole('button', { name: '그냥 찾을래' }));
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다 찾았어' }));
    await user.click(screen.getByRole('button', { name: '3개 이상' }));
    expect(screen.getByRole('heading', { name: '잠깐 다른 시간을 보냈어.' })).toBeInTheDocument();
  });

  it('1분 낙서: 주제 · 새로운 주제 · 마우스/터치로 그리기 · 전체 지우기 · 다시 시작 · 완료 (저장 안 함)', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('play-doodle'));
    expect(screen.getByText('오늘의 주제')).toBeInTheDocument();
    const before = stageText();
    await user.click(screen.getByRole('button', { name: '새로운 주제' }));
    expect(stageText()).not.toBe(before);
    await user.click(screen.getByRole('button', { name: '시작' }));

    const canvas = screen.getByRole('img', { name: /낙서하는 캔버스/ });
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas).toHaveTextContent(/종이에 그려도 좋아/); // 캔버스를 못 쓰는 환경을 위한 설명
    expect(screen.getByRole('button', { name: '전체 지우기' })).toBeDisabled();
    expect(screen.getByRole('timer')).toBeInTheDocument();

    // 마우스
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: 'mouse', clientX: 40, clientY: 30 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(canvas).toHaveAttribute('data-has-drawing', 'true');

    // 전체 지우기
    await user.click(screen.getByRole('button', { name: '전체 지우기' }));
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(screen.getByRole('img', { name: /아직 비어 있어/ })).toBeInTheDocument();

    // 터치 (Pointer Events라 같은 경로) — 스크롤 대신 그리기
    const canvas2 = screen.getByRole('img', { name: /낙서하는 캔버스/ });
    fireEvent.pointerDown(canvas2, { pointerId: 2, pointerType: 'touch', clientX: 5, clientY: 5 });
    fireEvent.pointerMove(canvas2, { pointerId: 2, pointerType: 'touch', clientX: 20, clientY: 25 });
    fireEvent.pointerUp(canvas2, { pointerId: 2 });
    expect(canvas2).toHaveAttribute('data-has-drawing', 'true');
    expect(readFileSync(join(process.cwd(), 'src/features/play/play.module.css'), 'utf8')).toMatch(/touch-action: none/);

    // 다시 시작 → 빈 캔버스
    await user.click(screen.getByRole('button', { name: '다시 시작' }));
    expect(screen.getByRole('img', { name: /아직 비어 있어/ })).toBeInTheDocument();

    const stored = JSON.stringify({ ...localStorage });
    await user.click(screen.getByRole('button', { name: '다 그렸어' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-doodle/done');
    // 그림은 어디에도 저장하지 않는다 (완료 기록만)
    expect(JSON.stringify({ ...localStorage })).not.toMatch(/data:image/);
    expect(stored).not.toMatch(/data:image/);
    expect(getRecords()).toHaveLength(1);
  });

  it('사진 미션: 카메라 없이 "찾으러 갈래" → "찾았어"로 완료', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('play-photo-mission'));
    expect(screen.getByText('오늘의 사진 미션')).toBeInTheDocument();
    const before = stageText();
    await user.click(screen.getByRole('button', { name: '다른 미션' }));
    expect(stageText()).not.toBe(before);
    await user.click(screen.getByRole('button', { name: '찾으러 갈래' }));
    expect(document.querySelector('input[type=file]')).toBeNull();
    await user.click(screen.getByRole('button', { name: '찾았어' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-photo-mission/done');
  });

  it('30초 관찰: 시작 → 30초 → 질문 → 어느 답이든 완료', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const router = renderAt(play('play-observe-30'));
    await user.click(screen.getByRole('button', { name: '30초 시작' }));
    expect(screen.getByRole('timer')).toHaveTextContent('0:30');
    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    expect(screen.getByText('아까는 안 보였는데 지금 보인 게 있어?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '잘 모르겠어' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-observe-30/done');
  });

  it('랜덤 질문: 다른 질문 → 다 했어', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('play-small-question'));
    const q = () => screen.getByText(/\?$/).textContent;
    const first = q();
    expect(QUESTIONS).toContain(first);
    await user.click(screen.getByRole('button', { name: '다른 질문' }));
    expect(q()).not.toBe(first);
    await user.click(screen.getByRole('button', { name: '다 했어' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-small-question/done');
  });

  it('5초 기억하기: 5개를 5초 보여주고 숨김 → 고르기 → "N개 기억했네" (점수 누적 없음)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const router = renderAt(play('play-memory-5s'));
    await user.click(screen.getByRole('button', { name: '시작' }));
    const shown = within(screen.getByRole('list', { name: '기억할 것들' }))
      .getAllByRole('listitem')
      .map((li) => li.lastElementChild!.textContent!);
    expect(shown).toHaveLength(5);
    act(() => {
      vi.advanceTimersByTime(5_500);
    });
    expect(screen.queryByRole('list', { name: '기억할 것들' })).not.toBeInTheDocument();
    const options = within(screen.getByRole('group', { name: '기억나는 것 고르기' })).getAllByRole('button');
    expect(options).toHaveLength(10);
    // 두 개만 맞게 고른다
    for (const name of shown.slice(0, 2)) await user.click(screen.getByRole('button', { name: new RegExp(`${name}$`) }));
    await user.click(screen.getByRole('button', { name: '다 골랐어' }));
    expect(screen.getByText('2개 기억했네.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/최고 기록|랭킹|실패|점수/);
    await user.click(screen.getByRole('button', { name: '다 했어' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-memory-5s/done');
    expect(JSON.stringify({ ...localStorage })).not.toMatch(/best|score/i);
  });

  it('이모지 이야기: 3~5개 · 다른 조합 → 다 했어', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('play-emoji-story'));
    const label = () => screen.getByLabelText(/^이모지 \d개/).getAttribute('aria-label')!;
    const first = label();
    expect(Number(first.match(/\d/)![0])).toBeGreaterThanOrEqual(3);
    expect(Number(first.match(/\d/)![0])).toBeLessThanOrEqual(5);
    await user.click(screen.getByRole('button', { name: '다른 조합' }));
    expect(label()).not.toBe(first);
    await user.click(screen.getByRole('button', { name: '다 했어' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-emoji-story/done');
  });

  it('소리 찾기: 마이크 없이 시작 → 다 들었어 → 소리 고르기(여러 개) → 다 했어', async () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    const user = userEvent.setup();
    const router = renderAt(play('play-sound-find'));
    expect(screen.getByText('마이크를 쓰거나 녹음하지 않아.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '시작' }));
    expect(screen.getByRole('timer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다 들었어' }));
    await user.click(screen.getByRole('button', { name: '바깥 소리' }));
    await user.click(screen.getByRole('button', { name: '자연 소리' }));
    expect(screen.getByRole('button', { name: '바깥 소리' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: '다 했어' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-sound-find/done');
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});

describe('완료 · 또 놀아볼래 · 중간 종료 · 기록', () => {
  it('완료 화면: 또 놀아볼래?는 다른 실행형 PLAY로, HOME · MY', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('play-observe-30'));
    await user.click(screen.getByRole('button', { name: '여기까지만 할래' }));
    expect(screen.getByRole('heading', { name: '잠깐 다른 시간을 보냈어.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'HOME으로 돌아가기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'MY OFFROU 보기' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '또 놀아볼래?' }));
    const [, , , id, page] = router.state.location.pathname.split('/');
    expect(page).toBe('play');
    expect(id).not.toBe('play-observe-30');
    expect(getExperience(id)?.interaction?.type).toBe('play');
    expect(screen.getByRole('region', { name: '바로 놀기' })).toBeInTheDocument();
  });

  it('중간 종료: "여기까지만 할래"는 실패 없이 기록, 나가기 → 그냥 나가기는 기록 없음', async () => {
    const user = userEvent.setup();
    renderAt(play('play-small-choice'));
    await user.click(screen.getByRole('button', { name: '여기까지만 할래' }));
    expect(getRecords()).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/실패|포기/);

    const router = renderAt(play('play-three-words'));
    await user.click(screen.getByRole('button', { name: /나가기/ }));
    await user.click(screen.getByRole('button', { name: '그냥 나가기' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-three-words');
    expect(getRecords()).toHaveLength(1);
  });

  it('MY에 실행형 PLAY 기록이 남는다', async () => {
    const user = userEvent.setup();
    renderAt(play('play-emoji-story'));
    await user.click(screen.getByRole('button', { name: '다 했어' }));
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(screen.getByText('이모지 이야기')).toBeInTheDocument();
  });

  it('저장한 PLAY: ♡ 저장 → MY 저장한 시간에서 바로 실행', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/experience/play-memory-5s');
    await user.click(screen.getByRole('button', { name: /저장/ }));
    renderAt('/app/my?tab=saved');
    expect(screen.getByText('5초 기억하기')).toBeInTheDocument();
    void router;
  });

  it('비회원: 로그인 없이 바로 놀 수 있다 (계정 기능이 켜져 있어도)', async () => {
    setBackendForTesting(new FakeServer().createDevice());
    const user = userEvent.setup();
    renderAt(play('play-three-words'));
    expect(screen.queryByText(/로그인/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '시작' }));
    await user.click(screen.getByRole('button', { name: '다 했어' }));
    expect(getRecords()).toHaveLength(1);
  });

  it('로그인 사용자: 실행형 PLAY 완료도 계정에 동기화된다 (kind: play)', async () => {
    const server = new FakeServer();
    const device = server.createDevice();
    await device.signUp('me@offrou.app', 'long-enough-1');
    setBackendForTesting(device);
    const user = userEvent.setup();
    renderAt('/app/my');
    await screen.findByText('OFFROU가 이어지고 있어.');
    renderAt(play('play-small-question'));
    await user.click(screen.getByRole('button', { name: '다 했어' }));
    const id = server.userId('me@offrou.app')!;
    await vi.waitFor(() => expect(server.snapshotOf(id).records.map((r) => r.experienceId)).toContain('play-small-question'), {
      timeout: 5000,
    });
    expect(server.snapshotOf(id).records[0].kind).toBe('play');
  });
});

describe('추천 연결', () => {
  const runnable = (id?: string) => !!id && getExperience(id)?.interaction?.type === 'play';
  const hits = (fn: (r: () => number) => string | undefined) => {
    for (let seed = 1; seed < 400; seed++) if (runnable(fn(seededRandom(seed)))) return true;
    return false;
  };

  it('잠깐 놀고 싶어 · 5분: 후보가 거의 모두 실행형 PLAY', () => {
    const c = candidatesFor('play', findDuration('5m')!);
    expect(c.filter((e) => runnable(e.id)).length).toBeGreaterThanOrEqual(10);
    expect(hits((random) => recommendExperience({ mood: 'play', duration: findDuration('10m')!, random })?.experience.id)).toBe(true);
  });

  it('아무거나 해볼래 → 실행형 PLAY가 나올 수 있다', () => {
    expect(hits((random) => recommendExperience({ mood: 'anything', duration: findDuration('any')!, random })?.experience.id)).toBe(true);
  });

  it('지금 딱 하나 → 실행형 PLAY가 후보에 있다', () => {
    expect(instantCandidates().filter((e) => runnable(e.id)).length).toBeGreaterThanOrEqual(10);
  });

  it('오늘의 OFFROU → 날에 따라 실행형 PLAY가 나온다', () => {
    let found = false;
    for (let d = 0; d < 120 && !found; d++) found = runnable(pickDaily({ date: new Date(2026, 9, 1 + d) })?.id);
    expect(found).toBe(true);
  });

  it('작은 코스(재밌게) → 실행형 PLAY가 들어가고, 코스 안에서 실행된다', async () => {
    expect(hits((random) => generateCourse({ minutes: 20, vibe: 'fun', random })?.stepIds.find(runnable))).toBe(true);
    const user = userEvent.setup();
    const router = renderAt('/app/course?cmin=20&cvibe=fun&csteps=play-three-words,play-memory-5s,play-small-choice');
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-three-words/play');
    expect(screen.getByRole('region', { name: '바로 놀기' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '시작' }));
    await user.click(screen.getByRole('button', { name: '다 했어' }));
    expect(screen.getByRole('heading', { name: '한 시간을 보냈어.' })).toBeInTheDocument();
    expect(getRecords()[0].courseRunId).toBeTruthy();
  });

  it('발견 → PLAY: "바로 놀기" 표시 → 상세 → 시작', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/discover/play');
    // 목록 첫 화면에 보이는 실행형 PLAY마다 작은 표시 하나
    expect(screen.getAllByText('바로 놀기').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('link', { name: /랜덤 단어 3개/ }));
    expect(router.state.location.pathname).toBe('/app/experience/play-three-words');
    await user.click(screen.getByRole('button', { name: /시작/ }));
    expect(router.state.location.pathname).toBe('/app/experience/play-three-words/play');
  });

  it('HOME → 잠깐 놀고 싶어 → 5분 → 추천 → 시작 → 실행형 PLAY → 완료 → MY', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');
    await user.click(screen.getByRole('button', { name: /잠깐 놀고 싶어/ }));
    await user.click(screen.getByRole('button', { name: '5분' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    // 실행형이 나올 때까지 "다른 시간 보기" (후보 대부분이 실행형)
    for (let i = 0; i < 10 && !runnable(new URLSearchParams(router.state.location.search).get('pick')!); i++)
      await user.click(screen.getByRole('button', { name: /다른 시간 보기/ }));
    const id = new URLSearchParams(router.state.location.search).get('pick')!;
    expect(runnable(id)).toBe(true);
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(screen.getByRole('region', { name: '바로 놀기' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '여기까지만 할래' }));
    expect(getRecords()[0]).toMatchObject({ experienceId: id, moodId: 'play', durationId: '5m', kind: 'play' });
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(screen.getAllByText(getExperience(id)!.title).length).toBeGreaterThan(0);
  });
});

describe('접근성 · 철학', () => {
  it('모든 실행형 PLAY: 시작 화면이 짧고, 버튼은 의미 있는 button, 게임 요소 없음', () => {
    for (const e of RUNNABLE) {
      renderAt(play(e.id));
      const region = screen.getByRole('region', { name: '바로 놀기' });
      expect(within(region).getByText(/약 \d+분/)).toBeInTheDocument();
      for (const b of within(region).getAllByRole('button')) {
        expect(b.tagName).toBe('BUTTON');
        expect(b.textContent!.trim().length).toBeGreaterThan(0);
      }
      expect(document.body.textContent).not.toMatch(/레벨|경험치|랭킹|승률|연속|streak|보상|랜덤박스|결제|광고/i);
    }
  });

  it('키보드만으로도 진행할 수 있다 (작은 선택)', async () => {
    const user = userEvent.setup();
    renderAt(play('play-small-choice'));
    const [left] = within(screen.getByRole('group', { name: '둘 중 하나' })).getAllByRole('button');
    left.focus();
    await user.keyboard('{Enter}');
    expect(left).toHaveAttribute('aria-pressed', 'true');
    screen.getByRole('button', { name: '여기까지' }).focus();
    await user.keyboard(' ');
    expect(screen.getByRole('heading', { name: '잠깐 다른 시간을 보냈어.' })).toBeInTheDocument();
  });

  it('타이머는 시작과 끝을 화면 읽기 프로그램에 알린다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAt(play('play-sound-find'));
    await user.click(screen.getByRole('button', { name: '시작' }));
    expect(screen.getByText('30초 타이머를 시작했어.')).toHaveAttribute('aria-live', 'polite');
  });

  it('다크모드: 캔버스 선 색은 테마 글자색을 따른다', () => {
    const css = readFileSync(join(process.cwd(), 'src/features/play/play.module.css'), 'utf8');
    expect(css).toMatch(/\.canvas \{[^}]*color: var\(--color-text\)/);
    expect(css).toMatch(/\.canvas \{[^}]*background: var\(--color-bg\)/);
    expect(readFileSync(join(process.cwd(), 'src/features/play/DrawingCanvas.tsx'), 'utf8')).toContain('getComputedStyle(canvas).color');
  });

  it('카메라·마이크·위치·업로드를 쓰지 않는다', () => {
    const dir = join(process.cwd(), 'src/features/play');
    const files = ['PlayRunner.tsx', 'parts.tsx', 'DrawingCanvas.tsx', 'programs/DrawPlay.tsx', 'programs/PhotoPlay.tsx', 'programs/TimedLookPlay.tsx'];
    for (const f of files) {
      const src = readFileSync(join(dir, f), 'utf8');
      expect(src, f).not.toMatch(/getUserMedia|geolocation|toDataURL|toBlob|fetch\(|type="file"/);
    }
  });
});
