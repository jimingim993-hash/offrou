import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '@/app/router';
import { getExperience, getStory } from '@/services/experiences';
import { instantCandidates } from '@/services/recommendation';
import { getRecords } from '@/services/records';
import { getCourseRunsRaw, getSavedCourses } from '@/services/courses';
import { buildCourse } from '@/services/course';
import { setBackendForTesting } from '@/services/account/backend';
import { FakeServer } from './fakeBackend';

type User = ReturnType<typeof userEvent.setup>;

const renderAt = (path: string) => {
  cleanup();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};

const param = (router: ReturnType<typeof renderAt>, key: string) => new URLSearchParams(router.state.location.search).get(key);

/** 지금 진행 화면의 경험을 실행 방식에 맞게 끝까지 해본다 (이야기는 첫 선택지로, PLAY는 대답을 차례로) */
async function completeCurrent(user: User, router: ReturnType<typeof renderAt>) {
  const id = router.state.location.pathname.split('/')[3];
  const e = getExperience(id)!;
  if (e.interaction?.type === 'story') {
    const story = getStory(e.interaction.storyId)!;
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    for (let i = 0; i < 10; i++) {
      const title = screen.getByRole('heading', { level: 2 }).textContent;
      const scene = story.scenes.find((s) => s.title === title)!;
      if (scene.isEnding) break;
      await user.click(screen.getByRole('button', { name: scene.choices?.[0].label ?? '다음' }));
    }
  } else if (e.interaction?.type === 'play' || e.interaction?.type === 'hobby') {
    // 실행형 PLAY는 언제든 '여기까지만 할래'로 마칠 수 있다 (프로그램별 진행은 stage10 테스트)
    await user.click(screen.getByRole('button', { name: '여기까지만 할래' }));
    return;
  } else if (e.interaction?.type === 'prompts') {
    for (const p of e.interaction.prompts.slice(0, -1)) await user.click(screen.getByRole('button', { name: p.action }));
    await user.click(screen.getByRole('button', { name: e.interaction.prompts.at(-1)!.action }));
    return;
  }
  await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
}

describe('새 HOME', () => {
  it('오늘은 어떤 시간을 보내볼까? · 지금 딱 하나 · 나에게 맞춰서 · 작은 코스 · 오늘의 OFFROU', () => {
    renderAt('/app');
    expect(screen.getByRole('heading', { level: 1, name: '오늘은 어떤 시간을 보내볼까?' })).toBeInTheDocument();
    // 화면에 보이는 순서대로 (아이콘은 aria-hidden이라 이름에 들어가지 않는다)
    const order = ['지금 딱 하나', '나에게 맞춰서', '작은 OFFROU 코스', '오늘의 OFFROU'].map((name) =>
      screen.getAllByRole('heading', { level: 2 }).indexOf(screen.getByRole('heading', { level: 2, name })),
    );
    expect(order).toEqual([0, 1, 2, 3]);
    expect(screen.getByText('생각하기 싫으면 그냥 눌러봐.')).toBeInTheDocument();
    expect(screen.getByText('조금 더 길게 다른 시간을 보내고 싶다면.')).toBeInTheDocument();
    expect(screen.getByText('오늘 이런 시간은 어때?')).toBeInTheDocument();
    // 기존 문구·선택지는 그대로
    expect(screen.getByText('오늘도 비슷한 하루였어?')).toBeInTheDocument();
    expect(screen.getByText('지금 어떤 시간이 필요해?')).toBeInTheDocument();
    // 압박 요소 없음
    expect(document.body.textContent).not.toMatch(/연속|출석|포인트|레벨|완료율|달성/);
  });
});

describe('흐름 A: 지금 딱 하나 → 시작 → 완료 → MY', () => {
  it('질문 없이 바로 하나, "다른 거", 시작해서 MY에 남는다', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');
    await user.click(screen.getByRole('button', { name: '바로 시작' }));
    expect(router.state.location.pathname).toBe('/app/now');
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    expect(screen.getByText('지금 이건 어때?')).toBeInTheDocument();
    const first = param(router, 'pick')!;
    expect(instantCandidates().map((e) => e.id)).toContain(first);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1); // 목록이 아니라 하나

    await user.click(screen.getByRole('button', { name: /다른 거/ }));
    const second = param(router, 'pick')!;
    expect(second).not.toBe(first);

    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    await completeCurrent(user, router);
    expect(router.state.location.pathname).toBe(`/app/experience/${second}/done`);
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(screen.getByText(getExperience(second)!.title)).toBeInTheDocument();
  });

  it('"다른 거"를 계속 눌러도 한 바퀴 돌기 전엔 겹치지 않는다', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/now');
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    const seen = [param(router, 'pick')];
    for (let i = 0; i < 9; i++) {
      await user.click(screen.getByRole('button', { name: /다른 거/ }));
      seen.push(param(router, 'pick'));
    }
    expect(new Set(seen).size).toBe(10);
  });

  it('새로고침해도 같은 하나', async () => {
    const router = renderAt('/app/now');
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    const pick = param(router, 'pick')!;
    renderAt(`/app/now?pick=${pick}`);
    expect(screen.getByText(getExperience(pick)!.invite)).toBeInTheDocument();
  });
});

describe('흐름 B: 나에게 맞춰서 (기존 추천 그대로)', () => {
  it('상태 → 시간 → 추천 → 경험', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');
    await user.click(screen.getByRole('button', { name: /밖에 나가고 싶어/ }));
    await user.click(screen.getByRole('button', { name: '30분' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    const pick = getExperience(param(router, 'pick')!)!;
    expect(pick.categoryId).toBe('out');
    expect(pick.minutes).toBeLessThanOrEqual(30);
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe(`/app/experience/${pick.id}/play`);
  });
});

describe('흐름 D: 오늘의 OFFROU', () => {
  it('HOME에서 오늘의 OFFROU를 시작해 마치면 MY에 남고, 다시 열어도 같은 오늘', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');
    const today = screen.getByRole('region', { name: '오늘의 OFFROU' });
    const href = within(today).getByRole('link').getAttribute('href')!;
    const id = href.split('/').pop()!;

    await user.click(within(today).getByRole('button', { name: '오늘의 OFFROU 시작하기' }));
    expect(router.state.location.pathname).toBe(`/app/experience/${id}/play`);
    await completeCurrent(user, router);
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(screen.getByText(getExperience(id)!.title)).toBeInTheDocument();

    renderAt('/app');
    expect(within(screen.getByRole('region', { name: '오늘의 OFFROU' })).getByRole('link')).toHaveAttribute('href', href);
  });
});

describe('흐름 C: 작은 OFFROU 코스', () => {
  it('30분 · 새롭게 → 코스 → 시작 → 다음 시간으로 … → 완료 → MY에 코스 하나로', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');
    await user.click(screen.getByRole('button', { name: '코스 만들기' }));
    expect(router.state.location.pathname).toBe('/app/course');
    const make = screen.getByRole('button', { name: '코스 만들기' });
    expect(make).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '30분' }));
    await user.click(screen.getByRole('button', { name: /새롭게/ }));
    await user.click(make);

    const steps = param(router, 'csteps')!.split(',');
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps.length).toBeLessThanOrEqual(4);
    const course = buildCourse('new', 30, steps)!;
    expect(screen.getByRole('heading', { level: 1, name: course.title })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: '코스 순서' })).getAllByRole('listitem')).toHaveLength(steps.length);
    expect(screen.getByText(`총 약 ${course.totalMinutes}분`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    for (let i = 0; i < steps.length; i++) {
      expect(router.state.location.pathname).toBe(`/app/experience/${steps[i]}/play`);
      expect(screen.getByRole('img', { name: `${i + 1} / ${steps.length}` })).toBeInTheDocument();
      expect(screen.getByText(course.title)).toBeInTheDocument();
      await completeCurrent(user, router);
      if (i < steps.length - 1) {
        expect(screen.getByRole('heading', { name: '한 시간을 보냈어.' })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '다음 시간으로' }));
      }
    }

    expect(router.state.location.pathname).toBe('/app/course/done');
    expect(screen.getByRole('heading', { name: '오늘은 평소와 조금 다른 시간을 보냈어.' })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/점수|포인트|완료율/);

    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    const list = screen.getByRole('tabpanel');
    expect(within(list).getByText(course.title)).toBeInTheDocument();
    expect(within(list).getByText(`작은 코스 · ${steps.length}개의 시간을 보냈어.`)).toBeInTheDocument();
    // 코스 안의 경험은 따로 늘어놓지 않는다
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(getRecords().filter((r) => r.courseRunId)).toHaveLength(steps.length);
  });

  it('중간에 "여기까지만 할래" → 실패가 아니라 차분한 마무리, 마친 만큼 남는다', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/course?cmin=30&cvibe=calm&csteps=rest-window,rest-dim-light,rest-ten-breaths');
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    await completeCurrent(user, router);
    // 두 번째 시간 진행 중에 나가기 → 여기까지만
    await user.click(screen.getByRole('button', { name: '다음 시간으로' }));
    await user.click(screen.getByRole('button', { name: /나가기/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '여기까지만 할래' }));

    expect(router.state.location.pathname).toBe('/app/course/done');
    expect(screen.getByRole('heading', { name: '여기까지 보낸 시간도 충분해.' })).toBeInTheDocument();
    expect(screen.getByText(/1개의 시간을 보냈어/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/실패|미완료/);
    const run = getCourseRunsRaw()[0];
    expect(run.completedIds).toEqual(['rest-window']);
    expect(run.endedAt).toBeDefined();
    expect(getRecords().map((r) => r.experienceId)).toEqual(['rest-window']);
  });

  it('다음 시간으로 가기 전에도 그만둘 수 있다', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/course?cmin=20&cvibe=calm&csteps=rest-window,rest-ten-breaths');
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    await completeCurrent(user, router);
    await user.click(screen.getByRole('button', { name: '여기까지만 할래' }));
    expect(screen.getByRole('heading', { name: '여기까지 보낸 시간도 충분해.' })).toBeInTheDocument();
  });

  it('"다른 코스", 새로고침해도 같은 코스', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/course?cmin=30&cvibe=fun&csteps=play-color-hunt,play-doodle,play-three-words');
    const title = screen.getByRole('heading', { level: 1 }).textContent;
    await user.click(screen.getByRole('button', { name: /다른 코스/ }));
    expect(param(router, 'csteps')).not.toBe('play-color-hunt,play-doodle,play-three-words');
    const url = router.state.location.pathname + router.state.location.search;
    const now = screen.getByRole('heading', { level: 1 }).textContent;
    renderAt(url);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(now);
    expect(title).toBeTruthy();
  });

  it('코스 저장 → MY 저장한 코스 → 다시 실행', async () => {
    const user = userEvent.setup();
    const path = '/app/course?cmin=20&cvibe=calm&csteps=rest-window,rest-ten-breaths';
    renderAt(path);
    await user.click(screen.getByRole('button', { name: /코스 저장/ }));
    expect(screen.getByRole('button', { name: /저장한 코스/ })).toHaveAttribute('aria-pressed', 'true');
    expect(getSavedCourses()).toHaveLength(1);

    const router = renderAt('/app/my?tab=courses');
    expect(screen.getByRole('tab', { name: /저장한 코스/, selected: true })).toBeInTheDocument();
    const title = getSavedCourses()[0].title;
    await user.click(screen.getByRole('link', { name: new RegExp(title) }));
    expect(router.state.location.pathname).toBe('/app/course');
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe('/app/experience/rest-window/play');

    renderAt('/app/my?tab=courses');
    await user.click(screen.getByRole('button', { name: `${title} 저장 취소` }));
    expect(screen.getByText('아직 저장한 코스가 없어.')).toBeInTheDocument();
  });
});

describe('PLAY · HOBBY · REST 실행 화면 보완', () => {
  it('PLAY: 랜덤 값이 마음에 안 들면 "다른 걸로 바꿔줘"', async () => {
    const user = userEvent.setup();
    // (색깔 찾기는 10단계에서 실행형 PLAY가 됐다 → 랜덤 값이 있는 할 일 방식은 반대 손으로 쓰기로 확인)
    renderAt('/app/experience/play-left-hand/play');
    await user.click(screen.getByRole('button', { name: '써봤어' }));
    const text = () => screen.getByText(/같은 손으로 .+ 하나를 그려봐/).textContent;
    const before = text();
    await user.click(screen.getByRole('button', { name: /다른 걸로 바꿔줘/ }));
    expect(text()).not.toBe(before);
    // 랜덤 값이 없는 다음 단계엔 버튼이 없다
    await user.click(screen.getByRole('button', { name: '그렸어' }));
    expect(screen.queryByRole('button', { name: /다른 걸로 바꿔줘/ })).not.toBeInTheDocument();
  });

  it('PLAY: 새 콘텐츠 "작은 질문 하나"', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/experience/play-small-question/play');
    expect(screen.getByText(/\?$/)).toBeInTheDocument();
    await completeCurrent(user, router);
    expect(router.state.location.pathname).toBe('/app/experience/play-small-question/done');
  });

  it('HOBBY: 10분만 맛보기, 다른 주제', async () => {
    const user = userEvent.setup();
    // (10분 드로잉은 11단계에서 실행형 HOBBY가 됐다 → 같은 방식은 처음 보는 단어 하나로 확인)
    renderAt('/app/experience/hobby-new-word/play');
    expect(screen.getByText('10분만 맛보기')).toBeInTheDocument();
    const subjects = getExperience('hobby-new-word')!.interaction as { subjects: string[] };
    const shown = () => subjects.subjects.find((s) => screen.queryByText(s));
    const before = shown();
    await user.click(screen.getByRole('button', { name: /다른 주제/ }));
    expect(shown()).not.toBe(before);
  });

  it('REST: 천천히 읽는 짧은 문장, 휴대폰 내려놓기 안내, 선택형 3분/5분', () => {
    // (창밖 바라보기는 12단계에서 실행형 REST가 됐다 → 같은 화면은 천천히 숨 열 번으로 확인)
    renderAt('/app/experience/rest-ten-breaths/play');
    expect(screen.getByText('들이쉬면서 하나.')).toBeInTheDocument();
    expect(screen.getByText(/휴대폰은 잠시 내려놓아도 괜찮아/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '선택형 타이머' })).toHaveTextContent('타이머 켜기 · 3분타이머 켜기 · 5분');
    expect(screen.queryByRole('timer')).not.toBeInTheDocument(); // 켜기 전엔 없음
  });
});

describe('로그인 사용자: 코스 동기화', () => {
  afterEach(() => setBackendForTesting(undefined));

  it('저장한 코스와 코스 기록이 계정에 이어진다', async () => {
    const user = userEvent.setup();
    const server = new FakeServer();
    setBackendForTesting(server.createDevice());
    renderAt('/app/account?mode=signup');
    await user.type(await screen.findByLabelText('이메일'), 'me@offrou.app');
    await user.type(screen.getByLabelText('비밀번호'), 'long-enough-1');
    await user.click(screen.getByRole('button', { name: 'OFFROU 시작하기' }));
    await screen.findByText('OFFROU가 이어지고 있어.');

    const router = renderAt('/app/course?cmin=20&cvibe=calm&csteps=rest-window,rest-ten-breaths');
    await user.click(await screen.findByRole('button', { name: /코스 저장/ }));
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    await completeCurrent(user, router);
    await user.click(screen.getByRole('button', { name: '여기까지만 할래' }));

    renderAt('/app/account');
    await user.click(await screen.findByRole('button', { name: '지금 동기화' }));
    await screen.findByText(/^동기화됨/);
    const remote = server.snapshotOf(server.userId('me@offrou.app')!);
    expect(remote.savedCourses).toHaveLength(1);
    expect(remote.courseRuns[0].completedIds).toEqual(['rest-window']);
    expect(remote.records[0].courseRunId).toBe(remote.courseRuns[0].id);
  });
});

describe('홈페이지 한 줄 소개', () => {
  it('지금 딱 하나·작은 코스를 짧게 소개 (HERO·구조는 그대로)', async () => {
    renderAt('/');
    await screen.findByRole('heading', { level: 1, name: '같은 하루에, 다른 시간을.' }, { timeout: 8000 }); // 병렬 실행 중 첫 lazy 로딩은 1초를 넘길 수 있다
    expect(screen.getByText(/고르기도 귀찮은 날엔/)).toHaveTextContent('지금 딱 하나');
    await waitFor(() => expect(screen.getByText(/고르기도 귀찮은 날엔/)).toHaveTextContent('작은 OFFROU 코스'));
  });
});
