import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '@/app/router';
import { getExperience } from '@/services/experiences';
import { findDuration } from '@/data/durations';
import { findCandidates } from '@/services/recommendation';

const renderAt = (path = '/') => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
};

const pickOf = (router: ReturnType<typeof renderAt>['router']) =>
  new URLSearchParams(router.state.location.search).get('pick');

describe('HOME → 추천 → 진행 → 완료 → MY', () => {
  it('전체 흐름이 동작하고 기록이 새로고침 후에도 남는다', async () => {
    const user = userEvent.setup();
    const { router, unmount } = renderAt('/');

    await user.click(screen.getByRole('button', { name: /쉬고 싶어/ }));
    await user.click(screen.getByRole('button', { name: '10분' }));
    await user.click(screen.getByRole('button', { name: '다음' }));

    // 추천: 한 번에 하나, 조건에 맞는 경험
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const first = getExperience(pickOf(router)!)!;
    expect(first.categoryId).toBe('rest');
    expect(first.minutes).toBeLessThanOrEqual(10);

    // 다른 시간 보기: 조건 유지 + 다른 경험
    await user.click(screen.getByRole('button', { name: /다른 시간 보기/ }));
    const second = getExperience(pickOf(router)!)!;
    expect(second.id).not.toBe(first.id);
    expect(second.categoryId).toBe('rest');
    expect(screen.getByText(second.invite)).toBeInTheDocument();

    // 시작 → 진행
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe(`/experience/${second.id}/play`);
    expect(screen.getByRole('heading', { name: second.title })).toBeInTheDocument();
    expect(screen.getByText(second.steps[0])).toBeInTheDocument();

    // 마치기 → 완료
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    expect(router.state.location.pathname).toBe(`/experience/${second.id}/done`);
    expect(screen.getByText('오늘의 OFFROU가 하나 남았어.')).toBeInTheDocument();
    expect(screen.getByText(second.doneMessage)).toBeInTheDocument();

    // MY에 기록
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));
    expect(screen.getByText(second.title)).toBeInTheDocument();
    expect(screen.queryByText('아직 남겨진 시간이 없어.')).not.toBeInTheDocument();

    // 새로고침(앱을 새로 띄움)해도 유지
    unmount();
    renderAt('/my');
    expect(screen.getByText(second.title)).toBeInTheDocument();
    expect(screen.getByText(/^REST · /)).toBeInTheDocument();
  });
});

describe('추천 결과 새로고침', () => {
  it('URL의 pick이 조건에 맞으면 같은 추천을 유지한다', () => {
    renderAt('/ready?mood=rest&time=10m&pick=rest-window');
    expect(screen.getByText('창밖을 5분만 바라봐.')).toBeInTheDocument();
  });

  it('pick이 조건에 맞지 않으면(시간 초과) 다른 경험으로 바꾼다', async () => {
    const { router } = renderAt('/ready?mood=rest&time=10m&pick=rest-blanket');
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    const pick = getExperience(pickOf(router)!)!;
    expect(pick.id).not.toBe('rest-blanket');
    expect(pick.minutes).toBeLessThanOrEqual(10);
  });

  it('후보가 하나뿐이면 "다른 시간 보기"를 숨긴다', async () => {
    expect(findCandidates('out', findDuration('5m')!)).toHaveLength(1);
    renderAt('/ready?mood=out&time=5m');
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    expect(screen.queryByRole('button', { name: /다른 시간 보기/ })).not.toBeInTheDocument();
  });
});

describe('경험 진행', () => {
  it('이야기를 끝내지 않아도 나가기에서 언제든 마칠 수 있다', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/experience/exp-bookstore/play');
    await user.click(screen.getByRole('button', { name: /나가기/ }));
    await user.click(screen.getByRole('button', { name: '여기까지 하고 마치기' }));
    expect(router.state.location.pathname).toBe('/experience/exp-bookstore/done');
  });

  it('없는 경험은 HOME으로 보낸다', () => {
    expect(renderAt('/experience/nope/play').router.state.location.pathname).toBe('/');
  });
});

describe('발견 → 경험', () => {
  it('카테고리 → 경험 상세 → 시작', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/discover');
    await user.click(screen.getByRole('link', { name: /EXPERIENCE/ }));
    expect(router.state.location.pathname).toBe('/discover/experience');
    expect(screen.getAllByRole('listitem')).toHaveLength(5 + 3); // 경험 5개 + 하단 내비 3개

    await user.click(screen.getByRole('link', { name: /심야 라디오 DJ/ }));
    expect(router.state.location.pathname).toBe('/experience/exp-radio-dj');
    expect(screen.getByText('오늘 밤은 심야 라디오 DJ가 되어봐.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe('/experience/exp-radio-dj/play');
  });
});
