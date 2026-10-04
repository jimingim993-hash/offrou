import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '@/app/router';
import { CATEGORIES } from '@/data/categories';
import { STORIES } from '@/data/stories';
import { getExperience, getExperiencesByCategory } from '@/services/experiences';
import { getRecords } from '@/services/records';
import { StoryView } from '@/features/experience/story/StoryRunner';
import type { InteractiveStory } from '@/types/story';

const renderAt = (...entries: string[]) => {
  const router = createMemoryRouter(routes, { initialEntries: entries, initialIndex: entries.length - 1 });
  render(<RouterProvider router={router} />);
  return router;
};

type User = ReturnType<typeof userEvent.setup>;

/** 화면의 장면 제목으로 현재 장면을 찾아 pick번째 선택지(없으면 '다음')를 누르며 끝까지 진행 */
async function playStory(user: User, story: InteractiveStory, pick = 0) {
  const start = screen.queryByRole('button', { name: '시작하기' });
  if (start) await user.click(start);
  for (let i = 0; i < 10; i++) {
    const title = screen.getByRole('heading', { level: 2 }).textContent;
    const scene = story.scenes.find((s) => s.title === title)!;
    expect(scene, `장면 "${title}"`).toBeDefined();
    if (scene.isEnding) return scene;
    if (scene.choices?.length) {
      await user.click(screen.getByRole('button', { name: scene.choices[Math.min(pick, scene.choices.length - 1)].label }));
    } else {
      await user.click(screen.getByRole('button', { name: '다음' }));
    }
  }
  throw new Error('결말에 도착하지 못함');
}

describe('EXPERIENCE 인터랙티브', () => {
  it.each(STORIES.map((s) => [s.title, s] as const))('%s: 처음부터 결말까지 진행하고 MY에 결말이 남는다', async (_, story) => {
    const user = userEvent.setup();
    const router = renderAt(`/app/experience/${story.experienceId}/play`);

    expect(screen.getByText(story.subtitle)).toBeInTheDocument();
    await playStory(user, story);
    expect(screen.getByText('오늘의 이야기')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    expect(router.state.location.pathname).toBe(`/app/experience/${story.experienceId}/done`);

    const record = getRecords()[0];
    expect(record).toMatchObject({ experienceId: story.experienceId, kind: 'story' });
    expect(record.endingTitle).toBeTruthy();
    expect(screen.getByText(`“${record.endingTitle}”`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(screen.getByText(`“${record.endingTitle}”`)).toBeInTheDocument();
    expect(screen.getByText(/^EXPERIENCE · 약/)).toBeInTheDocument();
  });

  it('진행 표시가 장면마다 바뀐다', async () => {
    const user = userEvent.setup();
    renderAt('/app/experience/exp-radio-dj/play');
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    expect(screen.getByRole('img', { name: '1 / 5' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '"오늘 하루도 수고했어요."' }));
    expect(screen.getByRole('img', { name: '2 / 5' })).toBeInTheDocument();
  });

  it('선택에 따라 다음 장면의 대사가 달라진다', async () => {
    const user = userEvent.setup();
    renderAt('/app/experience/exp-strange-city/play');
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    await user.click(screen.getByRole('button', { name: '북적이는 시장' }));
    expect(screen.getByText(/과일 가게 주인/)).toBeInTheDocument();
    expect(screen.queryByText(/공방에서 할아버지/)).not.toBeInTheDocument();
  });

  it('처음부터 다시 하고 다른 선택을 하면 다른 결말에 도착한다', async () => {
    const user = userEvent.setup();
    const story = STORIES.find((s) => s.experienceId === 'exp-detective')!;
    renderAt('/app/experience/exp-detective/play');
    const endingTitle = () => screen.getByText('오늘의 이야기').nextElementSibling?.textContent;

    await playStory(user, story, 0);
    const first = endingTitle();
    await user.click(screen.getByRole('button', { name: '처음부터 다시' }));
    expect(screen.getByRole('heading', { level: 2, name: '사건 소개' })).toBeInTheDocument();

    await playStory(user, story, 1);
    expect(endingTitle()).not.toBe(first);
  });

  it('잘못된 장면 id가 있어도 멈추지 않고 안내를 보여준다', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    const broken: InteractiveStory = {
      ...STORIES[0],
      start: 'a',
      scenes: [{ id: 'a', title: '첫 장면', description: '...', choices: [{ label: '앞으로', next: 'missing' }] }],
    };
    render(<StoryView story={broken} onFinish={onFinish} />);
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    await user.click(screen.getByRole('button', { name: '앞으로' }));
    expect(screen.getByText('이야기가 잠깐 길을 잃었어.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '여기서 마치기' }));
    expect(onFinish).toHaveBeenCalled();
  });

  it('없는 이야기와 연결된 경험도 안내를 보여준다', () => {
    const exp = getExperience('exp-bookstore')!;
    const orig = exp.interaction;
    exp.interaction = { type: 'story', storyId: 'nope' };
    try {
      renderAt('/app/experience/exp-bookstore/play');
      expect(screen.getByText('이야기가 잠깐 길을 잃었어.')).toBeInTheDocument();
    } finally {
      exp.interaction = orig;
    }
  });
});

describe('나가기', () => {
  it('진행 중에는 하단 내비 대신 나가기가 보인다', () => {
    renderAt('/app/experience/rest-window/play');
    expect(screen.queryByRole('navigation', { name: '주요 메뉴' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /나가기/ })).toBeInTheDocument();
  });

  it('그냥 나가면 이전 화면으로 돌아가고 기록은 남지 않는다', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/experience/exp-small-hotel', '/app/experience/exp-small-hotel/play');
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    await user.click(screen.getByRole('button', { name: /나가기/ }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('여기까지만 해도 괜찮아.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '그냥 나가기' }));

    expect(router.state.location.pathname).toBe('/app/experience/exp-small-hotel');
    expect(getRecords()).toHaveLength(0);
  });

  it('바로 들어온 경우엔 경험 상세로 나간다', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/experience/play-doodle/play');
    await user.click(screen.getByRole('button', { name: /나가기/ }));
    await user.click(screen.getByRole('button', { name: '그냥 나가기' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-doodle');
  });

  it('계속할래를 누르면 그대로 이어간다', async () => {
    const user = userEvent.setup();
    renderAt('/app/experience/exp-radio-dj/play');
    await user.click(screen.getByRole('button', { name: /나가기/ }));
    await user.click(screen.getByRole('button', { name: '계속할래' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시작하기' })).toBeInTheDocument();
  });
});

describe('다시 경험하기', () => {
  it('MY → 경험 상세에서 다시 시작할 수 있다', async () => {
    const user = userEvent.setup();
    const story = STORIES.find((s) => s.experienceId === 'exp-detective')!;
    const router = renderAt('/app/experience/exp-detective/play');
    await playStory(user, story);
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));

    await user.click(screen.getByRole('link', { name: /동네 탐정/ }));
    expect(router.state.location.pathname).toBe('/app/experience/exp-detective');
    expect(screen.getByText('다른 선택을 하면, 다른 하루가 될 수도 있어.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다시 경험하기' }));
    expect(router.state.location.pathname).toBe('/app/experience/exp-detective/play');
    await playStory(user, story, 1);
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));

    const [latest, earlier] = getRecords();
    expect(getRecords()).toHaveLength(2);
    expect(latest.endingTitle).not.toBe(earlier.endingTitle);
  });
});

describe('카테고리별 실행 화면', () => {
  it('REST: 문장과 선택형 타이머, 마치기', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/experience/rest-window/play');
    expect(screen.getByText('잠깐 창밖을 바라봐.')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();

    // 휴식 타이머는 선택형 3분 / 5분
    expect(screen.getAllByRole('button', { name: /타이머 켜기/ }).map((b) => b.textContent)).toEqual([
      '타이머 켜기 · 3분',
      '타이머 켜기 · 5분',
    ]);
    await user.click(screen.getByRole('button', { name: '타이머 켜기 · 5분' }));
    expect(screen.getByRole('timer')).toHaveTextContent('5:00');
    await user.click(screen.getByRole('button', { name: '타이머 끄기' }));
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    expect(router.state.location.pathname).toBe('/app/experience/rest-window/done');
    expect(getRecords()[0].kind).toBe('rest');
  });

  it('PLAY: 할 일을 하나씩 건네고 마지막 대답으로 완료', async () => {
    const user = userEvent.setup();
    // (색깔 찾기는 10단계에서 실행형 PLAY가 됐다 → 할 일 방식은 손 그림자 놀이로 확인한다)
    const router = renderAt('/app/experience/play-shadow-puppets/play');
    expect(screen.getByText('불을 조금 낮추고, 벽 쪽으로 불빛 하나를 비춰.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '1 / 3' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '비췄어' }));
    expect(screen.getByText(/손으로 (강아지|새|토끼|달팽이|악어) 그림자를 만들어봐\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '만들었어' }));
    await user.click(screen.getByRole('button', { name: '말해봤어' }));
    expect(router.state.location.pathname).toBe('/app/experience/play-shadow-puppets/done');
  });

  it('HOBBY: 오늘의 주제와 준비물을 보여주고 바로 시작', () => {
    renderAt('/app/experience/hobby-drawing/play');
    expect(screen.getByText('오늘 그릴 것')).toBeInTheDocument();
    const exp = getExperience('hobby-drawing')!;
    const subjects = exp.interaction?.type === 'focus' ? exp.interaction.subjects : [];
    expect(subjects.some((s) => screen.queryByText(s))).toBe(true);
    expect(screen.getByText('준비물 · 종이 / 연필이나 펜')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /타이머 켜기 · 10분/ })).toBeInTheDocument();
  });

  it('OUT: 예상 시간·비용·혼자 가능·준비물을 보여준다', () => {
    renderAt('/app/experience/out-new-route');
    const meta = screen.getByRole('list', { name: '경험 정보' });
    for (const text of ['약 10분', '비용 없음', '혼자 가능', '준비물 · 편한 신발']) {
      expect(within(meta).getByText(text)).toBeInTheDocument();
    }
  });

  it('OUT: 비용이 드는 경험은 비용 조금으로 표시', () => {
    renderAt('/app/experience/out-new-menu');
    expect(screen.getByText('비용 조금')).toBeInTheDocument();
  });

  it('모든 카테고리의 모든 경험이 실행 화면을 연다', () => {
    for (const c of CATEGORIES) {
      for (const e of getExperiencesByCategory(c.id)) {
        const { unmount } = render(
          <RouterProvider router={createMemoryRouter(routes, { initialEntries: [`/app/experience/${e.id}/play`] })} />,
        );
        expect(screen.getByRole('heading', { level: 1, name: e.title })).toBeInTheDocument();
        unmount();
      }
    }
  });
});
