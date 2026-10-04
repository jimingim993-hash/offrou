/// <reference types="node" />
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { routes } from '@/app/router';
import { DIRECTIONS, OUT_PROGRAMS, getOutProgram, isNight } from '@/data/out/programs';
import { OutEngine } from '@/features/out/OutEngine';
import { getExperience, listExperiences } from '@/services/experiences';
import { getRecords } from '@/services/records';
import { EMPTY_FILTER, searchExperiences } from '@/services/discovery';
import { candidatesFor, instantCandidates, pickDaily, recommendExperience, seededRandom } from '@/services/recommendation';
import { MAX_OUT_STEPS, generateCourse } from '@/services/course';
import { findDuration, DURATIONS } from '@/data/durations';
import { setBackendForTesting } from '@/services/account/backend';
import { FakeServer } from './fakeBackend';

const renderAt = (path: string) => {
  cleanup();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};
const play = (id: string) => `/app/experience/${id}/play`;
const RUNNABLE = listExperiences().filter((e) => e.interaction?.type === 'guide' && getOutProgram(e.interaction.program));
const isOut = (id?: string) => !!id && RUNNABLE.some((e) => e.id === id);
const done = (router: ReturnType<typeof renderAt>, id: string) => expect(router.state.location.pathname).toBe(`/app/experience/${id}/done`);

/** 밖으로 나가볼래 → 모든 단계 [했어] → 돌아왔어 */
async function runAll(user: ReturnType<typeof userEvent.setup>, id: string) {
  await user.click(screen.getByRole('button', { name: '밖으로 나가볼래' }));
  const program = getOutProgram(id)!;
  for (let i = 0; i < program.steps.length - 1; i++) {
    if (program.directions && i === 1) await user.click(screen.getByRole('button', { name: /안전한 곳에 서 있어/ }));
    await user.click(screen.getByRole('button', { name: '했어' }));
  }
  await user.click(screen.getByRole('button', { name: '돌아왔어' }));
}

afterEach(() => {
  vi.useRealTimers();
  setBackendForTesting(undefined);
});

describe('OutEngine · 데이터', () => {
  it('실행형 OUT 26개 (기존 11개 id 유지 + 새 15개), 모두 2단계 이상 · 실내 대체 활동', () => {
    expect(OUT_PROGRAMS).toHaveLength(26);
    expect(RUNNABLE).toHaveLength(26);
    expect(listExperiences().filter((e) => e.categoryId === 'out')).toHaveLength(26);
    for (const id of ['out-sky', 'out-new-route', 'out-scenery', 'out-new-menu', 'out-get-off-early', 'out-new-place', 'out-aimless-walk', 'out-park-hour', 'out-door-sounds', 'out-library', 'out-sunset'])
      expect(getExperience(id)?.interaction).toEqual({ type: 'guide', program: id });
    for (const p of OUT_PROGRAMS) {
      expect(p.steps.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.indoorFallback.steps.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.placeType).toBeTruthy();
    }
  });

  it('비용: 대부분 무료, 선택(optional)·조금(low)도 표시 · 준비물은 대부분 없음 · 혼자 가능', () => {
    const cost = (c: string) => RUNNABLE.filter((e) => (e.cost ?? 'free') === c).length;
    expect(cost('free')).toBeGreaterThanOrEqual(22);
    expect(getExperience('out-drink-walk')?.cost).toBe('optional');
    expect(getExperience('out-new-menu')?.cost).toBe('low');
    expect(RUNNABLE.filter((e) => e.supplies.length === 0).length).toBeGreaterThanOrEqual(18);
    expect(RUNNABLE.every((e) => e.solo === true)).toBe(true);
  });

  it('특정 업체·위험 장소·낯선 사람 접촉을 유도하지 않는다', () => {
    const text = JSON.stringify(OUT_PROGRAMS) + JSON.stringify(RUNNABLE);
    expect(text).not.toMatch(/스타벅스|이디야|교보|선로로|옥상으로|절벽|폐건물|무단|말을 걸어|따라가 봐|번호판을 찍/);
    expect(text).toMatch(/사유지/);
  });

  it('GPS·지도·위치 권한·카메라·걸음 수·업로드를 쓰지 않는다', () => {
    const files = ['src/features/out/OutEngine.tsx', 'src/data/out/programs.ts', ...readdirSync(join(process.cwd(), 'src/features/out')).map((f) => `src/features/out/${f}`)];
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), 'utf8');
      expect(src, f).not.toMatch(/geolocation|getCurrentPosition|watchPosition|permissions\.query|getUserMedia|DeviceMotion|Accelerometer|fetch\(|maps\.google|kakao\.maps|leaflet|type="file"/);
    }
    const pkg = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    expect(pkg).not.toMatch(/leaflet|mapbox|google-maps|kakao/);
  });

  it('잘못된 OUT 프로그램 id → 기존 진행 방법 목록으로', () => {
    expect(getOutProgram('nope')).toBeUndefined();
    const e = getExperience('out-bench')!;
    const original = e.interaction;
    e.interaction = { type: 'guide', program: 'nope' };
    try {
      renderAt(play(e.id));
      expect(screen.getByRole('heading', { name: '이렇게 해봐' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '이 시간 마치기' })).toBeInTheDocument();
    } finally {
      e.interaction = original;
    }
  });
});

describe('OUT 실행', () => {
  it('활동 확인: 예상 시간 · 장소 · 비용 · 준비물 · 안전 안내 · 날씨 안내 · [밖으로 나가볼래]', () => {
    renderAt(play('out-drink-walk'));
    const meta = screen.getByRole('list', { name: '활동 정보' });
    expect(within(meta).getByText(/약 15분/)).toBeInTheDocument();
    expect(within(meta).getByText(/동네 보행로/)).toBeInTheDocument();
    expect(within(meta).getByText(/비용은 선택/)).toBeInTheDocument();
    expect(within(meta).getByText(/물이나 마실 것/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '안전하게' })).toBeInTheDocument();
    expect(screen.getByText('걸으면서 마시지 말고, 멈춘 자리에서만.')).toBeInTheDocument();
    expect(screen.getByText('밖에 나가기 어려운 날이면 실내 대체 활동을 선택해도 돼.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '밖으로 나가볼래' })).toBeInTheDocument();
  });

  it.each(OUT_PROGRAMS.map((p) => p.id))('%s: 시작 → 단계별 [했어] → 돌아왔어 → 완료', async (id) => {
    const user = userEvent.setup();
    const router = renderAt(play(id));
    await runAll(user, id);
    done(router, id);
    expect(getRecords()[0]).toMatchObject({ experienceId: id, categoryId: 'out', kind: 'guide' });
  });

  it('단계마다 "화면을 내려놓고 다녀와" · 진행 표시', async () => {
    const user = userEvent.setup();
    renderAt(play('out-new-route'));
    await user.click(screen.getByRole('button', { name: '밖으로 나가볼래' }));
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
    expect(screen.getByText('평소 다니는 익숙한 길에서 출발해.')).toBeInTheDocument();
    expect(screen.getByText(/이제 화면을 내려놓고 다녀와/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '했어' }));
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
    expect(screen.getByText('안전한 갈림길 하나에서 평소와 다른 방향을 골라.')).toBeInTheDocument();
  });

  it('선택형 타이머 (5분 목적 없는 산책)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAt(play('out-aimless-5'));
    await user.click(screen.getByRole('button', { name: '밖으로 나가볼래' }));
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '타이머 켜기 · 5분 (선택)' }));
    expect(screen.getByRole('timer')).toHaveTextContent('5:00');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(301_000);
    });
    expect(screen.getByText('시간이 됐어. 천천히 돌아와.')).toBeInTheDocument();
  });

  it('랜덤: 색 · 글자 · 계절 힌트를 건넨다', () => {
    renderAt(play('out-color-walk'));
    expect(screen.getByText(/^오늘의 색: (빨간색|노란색|파란색|초록색|하얀색|주황색)$/)).toBeInTheDocument();
    renderAt(play('out-sign-letter'));
    expect(screen.getByText(/^오늘의 글자: [ㄱ-ㅎ]$/)).toBeInTheDocument();
    renderAt(play('out-season'));
    expect(screen.getByText(/^오늘의 힌트: (빛|나무|공기|옷차림|풍경)$/)).toBeInTheDocument();
  });

  it('랜덤 산책: 안전한 곳에 서 있을 때만 방향 → "안전하지 않아"면 바로 다른 선택', async () => {
    const user = userEvent.setup();
    renderAt(play('out-random-walk'));
    await user.click(screen.getByRole('button', { name: '밖으로 나가볼래' }));
    await user.click(screen.getByRole('button', { name: '했어' }));
    expect(screen.getByRole('button', { name: '했어' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /안전한 곳에 서 있어/ }));
    const dir = () => screen.getByText(/^이번엔 /).textContent!.replace('이번엔 ', '');
    const first = dir();
    expect(DIRECTIONS).toContain(first);
    await user.click(screen.getByRole('button', { name: /이 방향은 안전하지 않아/ }));
    expect(dir()).not.toBe(first);
    expect(screen.getByRole('button', { name: '했어' })).toBeEnabled();
  });

  it('실내 대체 활동: 밖에 못 나가도 [했어]로 완료', async () => {
    const user = userEvent.setup();
    const router = renderAt(play('out-park-10'));
    expect(screen.getByText(/근처에 공원이나 안전한 야외 공간이 있을 때만 해봐/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /실내에서 대신 할래 · 창가에서 바깥 보기/ }));
    expect(screen.getByText('실내 대체 활동')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '했어' }));
    done(router, 'out-park-10');
    expect(screen.getByText('밖에 나가지 않아도, 평소와 다른 시간을 보냈어.')).toBeInTheDocument();
  });

  it('밤 시간에는 밝고 익숙한 곳·실내 대체 활동을 권한다 (기기 시각만 사용)', () => {
    expect(isNight(new Date(2026, 9, 5, 22))).toBe(true);
    expect(isNight(new Date(2026, 9, 5, 3))).toBe(true);
    expect(isNight(new Date(2026, 9, 5, 14))).toBe(false);
    const e = getExperience('out-sunset')!;
    const program = getOutProgram('out-sunset')!;
    cleanup();
    render(<OutEngine experience={e} program={program} onFinish={() => {}} now={new Date(2026, 9, 5, 22)} />);
    expect(screen.getByRole('note')).toHaveTextContent('늦은 시간이야');
    cleanup();
    render(<OutEngine experience={e} program={program} onFinish={() => {}} now={new Date(2026, 9, 5, 14)} />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('사진 없이 완료 · 위치 권한 요청 없음 · 중간 종료는 실패 아님', async () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition, watchPosition: getCurrentPosition }, configurable: true });
    const user = userEvent.setup();
    let router = renderAt(play('out-scenery'));
    await runAll(user, 'out-scenery');
    done(router, 'out-scenery');
    expect(getCurrentPosition).not.toHaveBeenCalled();

    router = renderAt(play('out-three-new'));
    await user.click(screen.getByRole('button', { name: '밖으로 나가볼래' }));
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    done(router, 'out-three-new');
    expect(document.body.textContent).not.toMatch(/실패|포기/);
    // 기록에 위치 정보 없음
    expect(JSON.stringify(getRecords())).not.toMatch(/lat|lng|location|위도|경도/);
  });
});

describe('추천 · 연결', () => {
  const hits = (fn: (r: () => number) => string | undefined) => {
    for (let seed = 1; seed < 400; seed++) if (isOut(fn(seededRandom(seed)))) return true;
    return false;
  };

  it('밖에 나가고 싶어: 시간별로 맞는 OUT (5분 → 아주 짧은 것)', () => {
    for (const d of DURATIONS) {
      const c = candidatesFor('out', d);
      expect(c.every((e) => d.minutes === null || e.minutes <= d.minutes)).toBe(true);
    }
    const five = candidatesFor('out', findDuration('5m')!).map((e) => e.id).sort();
    expect(five).toEqual(['out-aimless-5', 'out-door-sounds', 'out-sky']);
    expect(candidatesFor('out', findDuration('10m')!).length).toBeGreaterThanOrEqual(12);
    expect(hits((random) => recommendExperience({ mood: 'out', duration: findDuration('10m')!, random })?.experience.id)).toBe(true);
    expect(hits((random) => recommendExperience({ mood: 'anything', duration: findDuration('any')!, random })?.experience.id)).toBe(true);
  });

  it('지금 딱 하나: 아주 짧은 OUT만 (10분 이하 · 무료 · 준비물 없음)', () => {
    const outs = instantCandidates().filter((e) => e.categoryId === 'out');
    expect(outs.length).toBeGreaterThanOrEqual(5);
    for (const e of outs) {
      expect(e.minutes).toBeLessThanOrEqual(10);
      expect(e.supplies).toHaveLength(0);
      expect(e.cost ?? 'free').toBe('free');
    }
    expect(outs.some((e) => e.id === 'out-park-hour')).toBe(false);
  });

  it('오늘의 OFFROU가 OUT이면 실제 OutEngine으로', async () => {
    let day = 0;
    while (day < 300 && !isOut(pickDaily({ date: new Date(2026, 9, 1 + day) })?.id)) day++;
    const id = pickDaily({ date: new Date(2026, 9, 1 + day) })!.id;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 1 + day, 12));
    const user = userEvent.setup();
    const router = renderAt('/app');
    await user.click(screen.getByRole('link', { name: new RegExp(getExperience(id)!.title) }));
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe(`/app/experience/${id}/play`);
    expect(screen.getByRole('button', { name: '밖으로 나가볼래' })).toBeInTheDocument();
  });

  it('작은 코스: OUT은 최대 2개, OUT → REST 순서로도 실행 → 다음 활동', async () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const vibe of ['out', 'any'] as const) {
        const c = generateCourse({ minutes: 60, vibe, random: seededRandom(seed) });
        if (!c) continue;
        expect(c.stepIds.filter((id) => getExperience(id)!.categoryId === 'out').length).toBeLessThanOrEqual(MAX_OUT_STEPS);
      }
    }
    const user = userEvent.setup();
    const router = renderAt('/app/course?cmin=20&cvibe=any&csteps=out-sky,rest-just-here,hobby-color-combo');
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe('/app/experience/out-sky/play');
    await runAll(user, 'out-sky');
    expect(screen.getByRole('heading', { name: '한 시간을 보냈어.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음 시간으로' }));
    expect(router.state.location.pathname).toBe('/app/experience/rest-just-here/play');
  });

  it('발견 → OUT (26개, 더 보기) → 상세 → 시작 · 장소/시간 필터', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/discover/out');
    for (let i = 0; i < 5; i++) {
      const more = screen.queryByRole('button', { name: /더 보기/ });
      if (!more) break;
      await user.click(more);
    }
    expect(screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/app/experience/out-')).length).toBe(26);
    await user.click(screen.getByRole('link', { name: /벤치 하나 찾아 앉기/ }));
    await user.click(screen.getByRole('button', { name: /시작/ }));
    expect(router.state.location.pathname).toBe('/app/experience/out-bench/play');
    expect(searchExperiences({ ...EMPTY_FILTER, category: 'out', time: '5m' } as never).every((e) => e.minutes <= 5)).toBe(true);
    expect(searchExperiences({ ...EMPTY_FILTER, place: 'outside' }).filter((e) => e.categoryId === 'out')).toHaveLength(26);
  });

  it('검색: 제목 · 설명 · 태그', () => {
    const ids = (q: string) => searchExperiences({ ...EMPTY_FILTER, q }).map((e) => e.id);
    expect(ids('벤치')).toContain('out-bench');
    expect(ids('간판')).toContain('out-sign-letter');
    expect(ids('계절')).toContain('out-season');
  });

  it('저장 → MY 저장한 시간 · 완료 → MY "OUT" 기록 (위치 없음)', async () => {
    const user = userEvent.setup();
    renderAt('/app/experience/out-look-up');
    await user.click(screen.getByRole('button', { name: /저장/ }));
    renderAt('/app/my?tab=saved');
    expect(screen.getByText('익숙한 장소 새롭게 보기')).toBeInTheDocument();
    renderAt(play('out-sky'));
    await runAll(user, 'out-sky');
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(screen.getByText('문 밖에서 하늘 보기')).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/OUT/);
  });

  it('비회원 · 로그인 사용자 (동기화 kind guide) · 오프라인에서도 실행', async () => {
    const user = userEvent.setup();
    setBackendForTesting(new FakeServer().createDevice());
    renderAt(play('out-bench'));
    expect(screen.queryByText(/로그인/)).not.toBeInTheDocument();

    localStorage.clear();
    const server = new FakeServer();
    const device = server.createDevice();
    await device.signUp('me@offrou.app', 'long-enough-1');
    setBackendForTesting(device);
    renderAt('/app/my');
    await screen.findByText('OFFROU가 이어지고 있어.');
    renderAt(play('out-block-loop'));
    await runAll(user, 'out-block-loop');
    const id = server.userId('me@offrou.app')!;
    await vi.waitFor(() => expect(server.snapshotOf(id).records.map((r) => r.experienceId)).toContain('out-block-loop'), { timeout: 5000 });
    expect(server.snapshotOf(id).records[0].kind).toBe('guide');

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    try {
      const router = renderAt(play('out-season'));
      await runAll(user, 'out-season');
      done(router, 'out-season');
    } finally {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    }
  });

  it('HOME → 밖에 나가고 싶어 → 10분 → OUT → 시작 → 단계 → 완료 → MY', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');
    await user.click(screen.getByRole('button', { name: /밖에 나가고 싶어/ }));
    await user.click(screen.getByRole('button', { name: '10분' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    const id = new URLSearchParams(router.state.location.search).get('pick')!;
    expect(isOut(id)).toBe(true);
    expect(getExperience(id)!.minutes).toBeLessThanOrEqual(10);
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    await runAll(user, id);
    expect(getRecords()[0]).toMatchObject({ experienceId: id, moodId: 'out', durationId: '10m' });
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(screen.getAllByText(getExperience(id)!.title).length).toBeGreaterThan(0);
  });
});

describe('접근성 · 회귀', () => {
  it('큰 시작 버튼 · 모두 button · 키보드로 진행', async () => {
    const user = userEvent.setup();
    renderAt(play('out-sky'));
    const start = screen.getByRole('button', { name: '밖으로 나가볼래' });
    expect(start.tagName).toBe('BUTTON');
    start.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
    const css = readFileSync(join(process.cwd(), 'src/features/out/out.module.css'), 'utf8');
    expect(css).toMatch(/min-height: 56px/);
    expect(css).toMatch(/safe-area-inset-bottom/);
    expect(css).toMatch(/prefers-reduced-motion/);
  });

  it('PLAY · HOBBY · REST · EXPERIENCE · HOME 6개 카드 그대로', () => {
    renderAt(play('play-three-words'));
    expect(screen.getByRole('region', { name: '바로 놀기' })).toBeInTheDocument();
    renderAt(play('hobby-one-card'));
    expect(screen.getByRole('region', { name: '취미 맛보기' })).toBeInTheDocument();
    renderAt(play('rest-just-here'));
    expect(screen.getByRole('button', { name: '여기 있을래' })).toBeInTheDocument();
    renderAt(play('exp-observatory'));
    expect(screen.getByRole('button', { name: '시작하기' })).toBeInTheDocument();
    renderAt('/app');
    expect(within(screen.getByRole('group', { name: '지금 어떤 시간이 필요해?' })).getAllByRole('button')).toHaveLength(6);
  });
});
