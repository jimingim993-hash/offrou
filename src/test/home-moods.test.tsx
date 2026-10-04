import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '@/app/router';
import { MOODS } from '@/data/moods';
import { DURATIONS } from '@/data/durations';
import { getExperience, getStory } from '@/services/experiences';
import { getRecords } from '@/services/records';
import type { MoodId } from '@/types/offrou';

/**
 * HOME "지금 어떤 시간이 필요해?" 6개 카드 회귀 테스트.
 * 카드 하나만 보고 "공통 컴포넌트니까 다 된다"고 가정하지 않고, 6개를 각각 끝까지 눌러본다.
 */
type User = ReturnType<typeof userEvent.setup>;

const renderAt = (path = '/app') => {
  cleanup();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};

const pickOf = (router: ReturnType<typeof renderAt>) => new URLSearchParams(router.state.location.search).get('pick');

/** 실제 프로젝트의 상태 ID와 카드 이름 (새 enum을 만들지 않는다) */
const EXPECTED: [MoodId, string][] = [
  ['rest', '쉬고 싶어'],
  ['anything', '아무거나 해볼래'],
  ['new', '새로운 걸 해보고 싶어'],
  ['play', '잠깐 놀고 싶어'],
  ['out', '밖에 나가고 싶어'],
  ['bedtime', '자기 전에 들어왔어'],
];

/** 추천이 이 상태·시간 조건에 맞는지 (기존 추천 메타데이터 기준) */
const fits = (experienceId: string, mood: MoodId, minutes: number | null) => {
  const e = getExperience(experienceId)!;
  return (mood === 'anything' || (e.moods as MoodId[]).includes(mood)) && (minutes === null || e.minutes <= minutes);
};

/** 진행 화면에서 실행 방식에 맞게 끝까지 해본다 */
async function finishPlay(user: User, router: ReturnType<typeof renderAt>) {
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
  } else if (e.interaction?.type === 'play') {
    // 실행형 PLAY는 언제든 '여기까지만 할래'로 마칠 수 있다 (프로그램별 진행은 stage10 테스트)
    await user.click(screen.getByRole('button', { name: '여기까지만 할래' }));
    return;
  } else if (e.interaction?.type === 'prompts') {
    for (const p of e.interaction.prompts) await user.click(screen.getByRole('button', { name: p.action }));
    return;
  }
  await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
}

describe('HOME 6개 상태 카드 — 카드마다 따로 확인', () => {
  it('카드는 6개이고, 실제 상태 ID와 이름이 그대로다', () => {
    expect(MOODS.map((m) => [m.id, m.label])).toEqual(EXPECTED);
    renderAt('/app');
    const group = screen.getByRole('group', { name: '지금 어떤 시간이 필요해?' });
    for (const [, label] of EXPECTED) {
      const card = screen.getByRole('button', { name: new RegExp(label) });
      expect(group).toContainElement(card);
      expect(card.tagName).toBe('BUTTON');
      expect(card).toHaveAttribute('type', 'button');
      expect(card).toHaveAttribute('aria-pressed', 'false');
      expect(card).toBeEnabled();
    }
  });

  it.each(EXPECTED)('%s(%s): 누르면 선택 표시와 함께 시간 선택이 열린다', async (_id, label) => {
    const user = userEvent.setup();
    renderAt('/app');
    expect(screen.queryByRole('heading', { name: '얼마나 시간이 있어?' })).not.toBeInTheDocument();
    const card = screen.getByRole('button', { name: new RegExp(label) });
    await user.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: '얼마나 시간이 있어?' })).toBeInTheDocument();
    for (const d of DURATIONS) expect(screen.getByRole('button', { name: d.label })).toBeInTheDocument();
    // 시간을 고르기 전에는 "다음"이 잠겨 있다
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
  });

  it.each(EXPECTED)('%s(%s): 키보드 Enter·Space로도 고를 수 있다', async (_id, label) => {
    const user = userEvent.setup();
    renderAt('/app');
    const card = screen.getByRole('button', { name: new RegExp(label) });
    card.focus();
    await user.keyboard('{Enter}');
    expect(card).toHaveAttribute('aria-pressed', 'true');
    // 다른 카드로 옮겨 Space
    const other = screen.getByRole('button', { name: new RegExp(EXPECTED.find(([, l]) => l !== label)![1]) });
    other.focus();
    await user.keyboard(' ');
    expect(other).toHaveAttribute('aria-pressed', 'true');
    expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  it.each(EXPECTED)('%s(%s): 5분·10분·30분·1시간·상관없어 모두 조건에 맞는 추천까지 간다', async (id, label) => {
    const user = userEvent.setup();
    for (const d of DURATIONS) {
      const router = renderAt('/app');
      await user.click(screen.getByRole('button', { name: new RegExp(label) }));
      await user.click(screen.getByRole('button', { name: d.label }));
      expect(screen.getByRole('button', { name: d.label })).toHaveAttribute('aria-pressed', 'true');
      await user.click(screen.getByRole('button', { name: '다음' }));

      await screen.findByRole('button', { name: '이 시간 시작하기' });
      const params = new URLSearchParams(router.state.location.search);
      expect(router.state.location.pathname).toBe('/app/ready');
      expect(params.get('mood')).toBe(id);
      expect(params.get('time')).toBe(d.id);
      expect(fits(pickOf(router)!, id, d.minutes), `${id} ${d.id} → ${pickOf(router)}`).toBe(true);
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it.each(EXPECTED)('%s(%s): 추천 → 다른 시간 보기 → 이 시간 시작하기 → 완료 → MY 기록', async (id, label) => {
    const user = userEvent.setup();
    const router = renderAt('/app');
    await user.click(screen.getByRole('button', { name: new RegExp(label) }));
    await user.click(screen.getByRole('button', { name: '상관없어' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    const first = pickOf(router)!;

    // 다른 시간 보기: 같은 조건 안에서 다른 경험
    await user.click(screen.getByRole('button', { name: /다른 시간 보기/ }));
    const second = pickOf(router)!;
    expect(second).not.toBe(first);
    expect(fits(second, id, null)).toBe(true);

    // 시작 → 실제 진행 화면
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe(`/app/experience/${second}/play`);
    expect(screen.getByRole('heading', { name: getExperience(second)!.title })).toBeInTheDocument();

    // 완료 → 기록
    await finishPlay(user, router);
    expect(router.state.location.pathname).toBe(`/app/experience/${second}/done`);
    expect(getRecords().map((r) => r.experienceId)).toContain(second);

    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(router.state.location.pathname).toBe('/app/my');
    expect(screen.getAllByText(getExperience(second)!.title).length).toBeGreaterThan(0);
  });
});
