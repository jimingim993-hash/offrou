/// <reference types="node" />
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { routes } from '@/app/router';
import { REST_PROGRAMS, getRestProgram } from '@/data/rest/programs';
import { getExperience, listExperiences } from '@/services/experiences';
import { getRecords } from '@/services/records';
import { candidatesFor, instantCandidates, pickDaily, recommendExperience, seededRandom } from '@/services/recommendation';
import { generateCourse } from '@/services/course';
import { findDuration, DURATIONS } from '@/data/durations';
import { setBackendForTesting } from '@/services/account/backend';
import { FakeServer } from './fakeBackend';

const renderAt = (path: string) => {
  cleanup();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};

const RUNNABLE = listExperiences().filter((e) => e.interaction?.type === 'rest' && e.interaction.program);
const play = (id: string) => `/app/experience/${id}/play`;
const done = (router: ReturnType<typeof renderAt>, id: string) =>
  expect(router.state.location.pathname).toBe(`/app/experience/${id}/done`);
const isRunnableRest = (id?: string) => !!id && RUNNABLE.some((e) => e.id === id);

/** 실제 시각 기준 타이머를 흉내 내며 앞으로 */
const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
const fakeTime = () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
};

afterEach(() => {
  vi.useRealTimers();
  setBackendForTesting(undefined);
});

describe('RestEngine · 데이터', () => {
  it('실행형 REST 12개 — 각자 경험과 연결, 시작 방법과 끝내는 방법이 있다', () => {
    expect(REST_PROGRAMS).toHaveLength(12);
    expect(RUNNABLE).toHaveLength(12);
    for (const p of REST_PROGRAMS) {
      expect(RUNNABLE.some((e) => e.interaction?.type === 'rest' && e.interaction.program === p.id), p.id).toBe(true);
      expect(Boolean(p.steps || p.timers?.length || p.untimedLabel), p.id).toBe(true);
      expect(p.endLabel).toBeTruthy();
    }
    expect(RUNNABLE.every((e) => e.categoryId === 'rest')).toBe(true);
    expect(RUNNABLE.filter((e) => e.supplies.length === 0).length).toBeGreaterThanOrEqual(10);
    // 기존 REST id 유지 · 개수 증가
    for (const id of ['rest-window', 'rest-screen-down', 'rest-quiet-sounds', 'rest-warm-drink', 'rest-dim-light'])
      expect(getExperience(id)?.interaction).toMatchObject({ type: 'rest' });
    expect(listExperiences().filter((e) => e.categoryId === 'rest')).toHaveLength(17);
  });

  it('효과·진단·점수 문구가 없다', () => {
    const text = JSON.stringify([REST_PROGRAMS, RUNNABLE]);
    expect(text).not.toMatch(/치료|불안|스트레스|잠이 잘|수면|시력|진단|점수|성공률|목표|연속|명상/);
  });

  it('잘못된 REST 프로그램 id → 기존 문장+선택형 타이머 화면으로', () => {
    expect(getRestProgram('nope')).toBeUndefined();
    const e = getExperience('rest-just-here')!;
    const original = e.interaction;
    e.interaction = { type: 'rest', prompt: '아무것도 안 해도 돼.', tone: 'night', program: 'nope' as never };
    try {
      renderAt(play(e.id));
      expect(screen.getByRole('group', { name: '선택형 타이머' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '이 시간 마치기' })).toBeInTheDocument();
    } finally {
      e.interaction = original;
    }
  });
});

describe('REST 12개: 시작 → 휴식 → 종료', () => {
  it('아무것도 하지 않는 3분: 3분 시작 → 작은 타이머 → 끝나면 "잠깐 멈춰 있었어." → 여기까지', async () => {
    const user = fakeTime();
    const router = renderAt(play('rest-nothing-3'));
    expect(screen.getByText('3분 동안 아무것도 하지 않아도 돼.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '3분 시작' }));
    expect(screen.getByText('아무것도 안 해도 돼.')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('3:00');
    await advance(181_000);
    expect(screen.getByText('잠깐 멈춰 있었어.')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '여기까지' }));
    done(router, 'rest-nothing-3');
  });

  it('아무것도 하지 않는 3분: 시간 없이 쉴래 → 타이머 없음', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('rest-nothing-3'));
    await user.click(screen.getByRole('button', { name: '시간 없이 쉴래' }));
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '여기까지' }));
    done(router, 'rest-nothing-3');
  });

  it('화면 내려놓기: 1분 · 3분 · 5분 타이머 (화면을 감시하지 않음)', async () => {
    const user = fakeTime();
    for (const [label, clock] of [['1분', '1:00'], ['3분', '3:00'], ['5분', '5:00']]) {
      renderAt(play('rest-phone-flip'));
      await user.click(screen.getByRole('button', { name: label }));
      expect(screen.getByRole('timer')).toHaveTextContent(clock);
    }
    await advance(301_000);
    expect(screen.getByText('다시 왔네.')).toBeInTheDocument();
    const src = readFileSync(join(process.cwd(), 'src/features/rest/RestEngine.tsx'), 'utf8');
    expect(src).not.toMatch(/visibilitychange|DeviceOrientation|wakeLock|addEventListener/);
  });

  it('창밖 보기: 1 → 2 → 3단계 → 여기까지', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('rest-window'));
    await user.click(screen.getByRole('button', { name: '시작' }));
    expect(screen.getByText('창문이나 먼 곳을 한번 바라봐.')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('움직이는 것 하나를 찾아봐.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('조금 더 멀리 있는 것을 바라봐.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '여기까지' }));
    done(router, 'rest-window');
  });

  it('한 가지 색 보기: 색 이름을 글자로 · 개수 경쟁 없음', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('rest-one-color'));
    expect(screen.getByText(/^오늘은 (초록색|하늘색|베이지색|연보라색|파란색|하얀색)을 잠깐 찾아볼까\?$/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '천천히 찾아볼래' }));
    expect(document.body.textContent).not.toMatch(/몇 개|1개|3개/);
    await user.click(screen.getByRole('button', { name: '여기까지' }));
    done(router, 'rest-one-color');
  });

  it('조용히 앉아 있기: 3분 · 5분 · 시간 없이', async () => {
    const user = userEvent.setup();
    renderAt(play('rest-sit-quietly'));
    expect(within(screen.getByRole('group', { name: '시작하기' })).getAllByRole('button').map((b) => b.textContent)).toEqual([
      '3분',
      '5분',
      '시간 없이',
    ]);
    await user.click(screen.getByRole('button', { name: '시간 없이' }));
    expect(screen.getByText('그냥 앉아 있으면 돼.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/호흡|숨을 \d/);
  });

  it('눈 쉬는 시간: 1분 시작 → 1분 지났어 → 조금 더(1분) → 여기까지', async () => {
    const user = fakeTime();
    const router = renderAt(play('rest-eyes'));
    await user.click(screen.getByRole('button', { name: '1분 시작' }));
    expect(screen.getByText('먼 곳을 바라봐. 화면은 안 봐도 돼.')).toBeInTheDocument();
    await advance(61_000);
    expect(screen.getByText('1분 지났어.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '조금 더' }));
    expect(screen.getByRole('timer')).toHaveTextContent('1:00');
    await user.click(screen.getByRole('button', { name: '여기까지' }));
    done(router, 'rest-eyes');
  });

  it('소리 듣기: 30초 → 조금 더 있을래 / 여기까지 (마이크 없음)', async () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    const user = fakeTime();
    const router = renderAt(play('rest-quiet-sounds'));
    expect(screen.getByText('마이크를 쓰거나 녹음하지 않아.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '30초 시작' }));
    await advance(31_000);
    expect(screen.getByRole('button', { name: '조금 더 있을래' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '여기까지' }));
    done(router, 'rest-quiet-sounds');
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(document.querySelector('audio')).toBeNull();
  });

  it('따뜻한 것 한 잔: 천천히 마실래 → 다 마셨어 (물만 있어도)', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('rest-warm-drink'));
    expect(screen.getByText('물 한 잔이어도 좋아.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '천천히 마실래' }));
    expect(screen.getByText('한 모금씩, 천천히.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다 마셨어' }));
    done(router, 'rest-warm-drink');
  });

  it('작은 스트레칭: 안전 안내 · 세 동작 · 여기까지', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('rest-small-stretch'));
    expect(screen.getByText('불편하면 바로 그만둬도 돼. 아프게 할 필요는 없어.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '시작' }));
    expect(screen.getByText('불편하면 바로 그만둬도 돼. 아프게 할 필요는 없어.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('자리에서 두 팔을 위로 올려 몸을 한번 늘여봐.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '여기까지' }));
    done(router, 'rest-small-stretch');
  });

  it('불 끄고 잠깐 있기: 안전 안내 · 조명은 직접 · 시간 없이', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('rest-dim-light'));
    expect(screen.getByText('안전한 곳이라면 방 조명을 조금 낮추고 잠깐 있어볼까?')).toBeInTheDocument();
    expect(screen.getByText(/조명은 직접 낮춰줘/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '시간 없이 있을래' }));
    await user.click(screen.getByRole('button', { name: '여기까지' }));
    done(router, 'rest-dim-light');
  });

  it('자기 전 화면 줄이기: 3분 쉬고 갈래 / 오늘은 바로 종료할래', async () => {
    const user = fakeTime();
    let router = renderAt(play('rest-screen-down'));
    expect(screen.getByText('OFFROU도 잠깐 내려놓을 시간이야.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '오늘은 바로 종료할래' }));
    done(router, 'rest-screen-down');
    expect(screen.getByText('오늘은 여기까지. 잘 자.')).toBeInTheDocument();

    router = renderAt(play('rest-screen-down'));
    await user.click(screen.getByRole('button', { name: '3분 쉬고 갈래' }));
    await advance(181_000);
    expect(screen.getByText('이제 화면을 꺼도 돼.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '이제 끌게' }));
    done(router, 'rest-screen-down');
  });

  it('그냥 여기 있기: 여기 있을래 → 거의 빈 화면 → 누르면 [조금 더] [이제 갈래]', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('rest-just-here'));
    expect(screen.getByText('아무것도 안 해도 돼.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '여기 있을래' }));
    // 조용한 화면: 버튼은 화면 전체 하나뿐
    const stage = document.querySelector('[class*="rest"]')!;
    expect(within(stage as HTMLElement).getAllByRole('button')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /선택지 보기/ }));
    await user.click(screen.getByRole('button', { name: '조금 더' }));
    expect(screen.queryByRole('button', { name: '이제 갈래' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /선택지 보기/ }));
    await user.click(screen.getByRole('button', { name: '이제 갈래' }));
    done(router, 'rest-just-here');
    expect(screen.getByText('그냥 여기 있었어. 그걸로 충분해.')).toBeInTheDocument();
  });
});

describe('타이머 · 중간 종료 · 기록', () => {
  it('타이머는 실제 시각 기준 — 탭이 멈췄다 돌아와도 남은 시간이 맞다', async () => {
    const user = fakeTime();
    renderAt(play('rest-sit-quietly'));
    await user.click(screen.getByRole('button', { name: '5분' }));
    // interval이 멈춘 것처럼 시각만 훌쩍 지나가게
    vi.setSystemTime(Date.now() + 120_000);
    await advance(300);
    expect(screen.getByRole('timer')).toHaveTextContent('3:00');
  });

  it('언제든 "이 시간 마치기" — 실패 없이 완료로 남는다 (모든 REST)', async () => {
    const user = userEvent.setup();
    for (const e of RUNNABLE) {
      const router = renderAt(play(e.id));
      await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
      done(router, e.id);
    }
    expect(getRecords()).toHaveLength(RUNNABLE.length);
    expect(getRecords().every((r) => r.kind === 'rest' && r.categoryId === 'rest')).toBe(true);
    expect(document.body.textContent).not.toMatch(/실패|포기|점수/);
  });

  it('MY: "그냥 여기 있기 · REST" 가벼운 기록', async () => {
    const user = userEvent.setup();
    renderAt(play('rest-just-here'));
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(screen.getByText('그냥 여기 있기')).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/REST/);
    expect(document.body.textContent).not.toMatch(/휴식 점수|휴식 목표|연속 휴식/);
  });

  it('비회원 · 로그인 사용자 모두 사용, 로그인 시 동기화 (kind rest)', async () => {
    setBackendForTesting(new FakeServer().createDevice());
    const user = userEvent.setup();
    renderAt(play('rest-nothing-3'));
    expect(screen.queryByText(/로그인/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '시간 없이 쉴래' }));
    await user.click(screen.getByRole('button', { name: '여기까지' }));
    expect(getRecords()).toHaveLength(1);

    localStorage.clear();
    const server = new FakeServer();
    const device = server.createDevice();
    await device.signUp('me@offrou.app', 'long-enough-1');
    setBackendForTesting(device);
    renderAt('/app/my');
    await screen.findByText('OFFROU가 이어지고 있어.');
    renderAt(play('rest-eyes'));
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    const id = server.userId('me@offrou.app')!;
    await vi.waitFor(() => expect(server.snapshotOf(id).records.map((r) => r.experienceId)).toContain('rest-eyes'), { timeout: 5000 });
    expect(server.snapshotOf(id).records[0].kind).toBe('rest');
  });

  it('오프라인이어도 REST는 그대로 시작·종료된다', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    try {
      const user = userEvent.setup();
      const router = renderAt(play('rest-window'));
      await user.click(screen.getByRole('button', { name: '시작' }));
      await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
      done(router, 'rest-window');
    } finally {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    }
  });
});

describe('추천 · 코스 · 발견 연결', () => {
  const hits = (fn: (r: () => number) => string | undefined) => {
    for (let seed = 1; seed < 400; seed++) if (isRunnableRest(fn(seededRandom(seed)))) return true;
    return false;
  };

  it('쉬고 싶어 · 자기 전에 → 실행형 REST, 고른 시간보다 긴 건 추천하지 않는다', () => {
    for (const mood of ['rest', 'bedtime'] as const) {
      for (const d of DURATIONS) {
        const c = candidatesFor(mood, d);
        expect(c.every((e) => d.minutes === null || e.minutes <= d.minutes), `${mood} ${d.id}`).toBe(true);
      }
      expect(hits((random) => recommendExperience({ mood, duration: findDuration('5m')!, random })?.experience.id)).toBe(true);
    }
    // 자기 전에는 REST가 대부분
    const bed = candidatesFor('bedtime', findDuration('5m')!);
    expect(bed.filter((e) => e.categoryId === 'rest').length).toBe(bed.length);
  });

  it('아무거나 · 지금 딱 하나 · 오늘의 OFFROU에서 실행형 REST가 나온다', () => {
    expect(hits((random) => recommendExperience({ mood: 'anything', duration: findDuration('any')!, random })?.experience.id)).toBe(true);
    expect(instantCandidates().filter((e) => isRunnableRest(e.id)).length).toBeGreaterThan(0);
    let found = false;
    for (let d = 0; d < 120 && !found; d++) found = isRunnableRest(pickDaily({ date: new Date(2026, 9, 1 + d) })?.id);
    expect(found).toBe(true);
  });

  it('지금 딱 하나 → REST가 나오면 RestEngine으로 실행', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/now');
    for (let i = 0; i < 90; i++) {
      const link = screen.getByRole('button', { name: '이 시간 시작하기' });
      const pick = new URLSearchParams(router.state.location.search).get('pick');
      if (isRunnableRest(pick ?? undefined)) {
        await user.click(link);
        expect(screen.getByRole('button', { name: '이 시간 마치기' })).toBeInTheDocument();
        expect(screen.queryByRole('group', { name: '선택형 타이머' })).not.toBeInTheDocument();
        return;
      }
      await user.click(screen.getByRole('button', { name: /다른 거/ }));
    }
    // 한 바퀴(후보 수) 안에 REST가 안 나오면 후보 구성이 잘못된 것
    expect.fail('지금 딱 하나에서 실행형 REST가 나오지 않았어');
  });

  it('오늘의 OFFROU가 REST면 실제 REST 실행 화면으로', async () => {
    const user = userEvent.setup();
    let day = 0;
    while (day < 200 && !isRunnableRest(pickDaily({ date: new Date(2026, 9, 1 + day) })?.id)) day++;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 1 + day, 12));
    const id = pickDaily({ date: new Date(2026, 9, 1 + day) })!.id;
    const router = renderAt('/app');
    await user.click(screen.getByRole('link', { name: new RegExp(getExperience(id)!.title) }));
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe(`/app/experience/${id}/play`);
    expect(screen.getByRole('button', { name: '이 시간 마치기' })).toBeInTheDocument();
  });

  it('작은 코스: REST → HOBBY → PLAY, REST 끝나면 다음 시간으로', async () => {
    expect(hits((random) => generateCourse({ minutes: 20, vibe: 'calm', random })?.stepIds.find(isRunnableRest))).toBe(true);
    const user = userEvent.setup();
    const router = renderAt('/app/course?cmin=20&cvibe=any&csteps=rest-just-here,hobby-color-combo,play-small-choice');
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe('/app/experience/rest-just-here/play');
    await user.click(screen.getByRole('button', { name: '여기 있을래' }));
    await user.click(screen.getByRole('button', { name: /선택지 보기/ }));
    await user.click(screen.getByRole('button', { name: '이제 갈래' }));
    expect(screen.getByRole('heading', { name: '한 시간을 보냈어.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음 시간으로' }));
    expect(router.state.location.pathname).toBe('/app/experience/hobby-color-combo/play');
  });

  it('발견 → REST: 제목 · 한 줄 설명 · 예상 시간 → 상세 → 시작', async () => {
    const user = userEvent.setup();
    // 목록은 8개씩 보여주므로 검색어로 찾는다
    const router = renderAt('/app/discover/rest?q=여기');
    const card = screen.getByRole('link', { name: /그냥 여기 있기/ });
    expect(card).toHaveTextContent('거의 아무것도 없는 화면');
    expect(card).toHaveTextContent('약 3분');
    await user.click(card);
    await user.click(screen.getByRole('button', { name: /시작/ }));
    expect(router.state.location.pathname).toBe('/app/experience/rest-just-here/play');
  });

  it('HOME → 쉬고 싶어 → 5분 → REST → 시작 → 종료 → MY', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');
    await user.click(screen.getByRole('button', { name: /쉬고 싶어/ }));
    await user.click(screen.getByRole('button', { name: '5분' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    const pick = () => new URLSearchParams(router.state.location.search).get('pick')!;
    for (let i = 0; i < 15 && !isRunnableRest(pick()); i++) await user.click(screen.getByRole('button', { name: /다른 시간 보기/ }));
    const id = pick();
    expect(isRunnableRest(id)).toBe(true);
    expect(getExperience(id)!.minutes).toBeLessThanOrEqual(5);
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    expect(getRecords()[0]).toMatchObject({ experienceId: id, moodId: 'rest', durationId: '5m', kind: 'rest' });
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(screen.getAllByText(getExperience(id)!.title).length).toBeGreaterThan(0);
  });

  it('HOME → 자기 전에 들어왔어 → REST → 시작', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');
    await user.click(screen.getByRole('button', { name: /자기 전에 들어왔어/ }));
    await user.click(screen.getByRole('button', { name: '10분' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    const pick = () => new URLSearchParams(router.state.location.search).get('pick')!;
    expect(getExperience(pick())!.categoryId).toBe('rest');
    for (let i = 0; i < 15 && !isRunnableRest(pick()); i++) await user.click(screen.getByRole('button', { name: /다른 시간 보기/ }));
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe(`/app/experience/${pick()}/play`);
    expect(screen.getByRole('button', { name: '이 시간 마치기' })).toBeInTheDocument();
  });
});

describe('화면 · 접근성 · 기존 기능', () => {
  it('REST 실행 중에는 하단 내비·추천 목록·통계가 없다', () => {
    renderAt(play('rest-just-here'));
    expect(screen.queryByRole('navigation', { name: '주요 메뉴' })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('모든 실행형 REST: 의미 있는 button, 타이머 접근성 라벨', async () => {
    const user = userEvent.setup();
    for (const e of RUNNABLE) {
      renderAt(play(e.id));
      for (const b of screen.getAllByRole('button')) {
        expect(b.tagName).toBe('BUTTON');
        expect((b.textContent ?? '').trim().length + (b.getAttribute('aria-label')?.length ?? 0)).toBeGreaterThan(0);
      }
    }
    renderAt(play('rest-eyes'));
    await user.click(screen.getByRole('button', { name: '1분 시작' }));
    expect(screen.getByRole('timer', { name: '남은 시간 1:00' })).toBeInTheDocument();
  });

  it('CSS: reduced motion 존중 · 안전 영역 · 가로 화면 · 빠른 애니메이션 없음', () => {
    const css = readFileSync(join(process.cwd(), 'src/features/rest/rest.module.css'), 'utf8');
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/env\(safe-area-inset-bottom\)/);
    expect(css).toMatch(/orientation: landscape/);
    expect(css).not.toMatch(/animation:/);
  });

  it('소리 자동 재생·외부 요청·알림 추가 없음', () => {
    for (const f of ['src/features/rest/RestEngine.tsx', 'src/data/rest/programs.ts']) {
      const src = readFileSync(join(process.cwd(), f), 'utf8');
      expect(src, f).not.toMatch(/<audio|new Audio|autoplay|fetch\(|Notification|getUserMedia|vibrate/);
    }
  });

  it('기존 PLAY · HOBBY · HOME 6개 카드 · / · /app 그대로', async () => {
    const user = userEvent.setup();
    renderAt('/app/experience/play-three-words/play');
    expect(screen.getByRole('region', { name: '바로 놀기' })).toBeInTheDocument();
    renderAt('/app/experience/hobby-color-combo/play');
    expect(screen.getByRole('region', { name: '취미 맛보기' })).toBeInTheDocument();
    renderAt('/app');
    for (const label of ['쉬고 싶어', '아무거나 해볼래', '새로운 걸 해보고 싶어', '잠깐 놀고 싶어', '밖에 나가고 싶어', '자기 전에 들어왔어'])
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /쉬고 싶어/ }));
    expect(screen.getByRole('heading', { name: '얼마나 시간이 있어?' })).toBeInTheDocument();
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: '같은 하루에, 다른 시간을.' }, { timeout: 8000 })).toBeInTheDocument();
    const manifest = JSON.parse(readFileSync(join(process.cwd(), 'public/manifest.webmanifest'), 'utf8'));
    expect(manifest.start_url).toBe('/app');
  });
});
