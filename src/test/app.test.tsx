import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '@/app/router';
import { CATEGORIES } from '@/data/categories';
import { MOODS } from '@/data/moods';

const renderAt = (path = '/app') => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};

describe('HOME', () => {
  it('핵심 문구와 6개의 상태 카드를 보여준다', () => {
    renderAt('/app');
    expect(screen.getByText('오늘도 비슷한 하루였어?')).toBeInTheDocument();
    expect(screen.getByText('잠깐 다른 시간으로 가볼까?')).toBeInTheDocument();
    expect(MOODS).toHaveLength(6);
    for (const m of MOODS) {
      expect(screen.getByRole('button', { name: new RegExp(m.label) })).toBeInTheDocument();
    }
    expect(screen.queryByText('얼마나 시간이 있어?')).not.toBeInTheDocument();
  });

  it('상태 → 시간 선택 → 다음으로 추천 결과까지 이동한다', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');

    await user.click(screen.getByRole('button', { name: /쉬고 싶어/ }));
    expect(screen.getByText('얼마나 시간이 있어?')).toBeInTheDocument();

    const next = screen.getByRole('button', { name: '다음' });
    expect(next).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '10분' }));
    expect(next).toBeEnabled();
    await user.click(next);

    expect(router.state.location.pathname).toBe('/app/ready');
    expect(await screen.findByText('오늘의 OFFROU')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '이 시간 시작하기' })).toBeInTheDocument();
  });
});

describe('추천 결과 화면', () => {
  it('URL 파라미터로 직접 진입(새로고침)해도 표시된다', () => {
    renderAt('/app/ready?mood=out&time=any');
    expect(screen.getByText('밖에 나가고 싶어')).toBeInTheDocument();
    expect(screen.getByText('상관없어')).toBeInTheDocument();
  });

  it('잘못된 파라미터는 안내 화면을 보여준다', () => {
    renderAt('/app/ready?mood=nope');
    expect(screen.getByText('어떤 시간이 필요한지 먼저 골라줘.')).toBeInTheDocument();
  });
});

describe('내비게이션', () => {
  it('HOME / 발견 / MY 간 이동', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');

    await user.click(screen.getByRole('link', { name: '발견' }));
    expect(router.state.location.pathname).toBe('/app/discover');
    for (const c of CATEGORIES) expect(screen.getByText(c.code)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'MY' }));
    expect(screen.getByText('아직 남겨진 시간이 없어.')).toBeInTheDocument();
    expect(screen.getByText('첫 번째 OFFROU를 경험하면 여기에 하나씩 쌓일 거야.')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'HOME' }));
    expect(router.state.location.pathname).toBe('/app');
  });

  it('카테고리 상세는 실제 경험 목록을 보여준다', () => {
    renderAt('/app/discover/hobby');
    const list = screen.getByRole('list', { name: '경험 목록' });
    expect(within(list).getByRole('link', { name: /10분 드로잉/ })).toBeInTheDocument();
  });

  it('없는 카테고리는 발견 화면으로 보낸다', () => {
    expect(renderAt('/app/discover/nope').state.location.pathname).toBe('/app/discover');
  });

  it('알 수 없는 경로는 HOME으로 보낸다', () => {
    expect(renderAt('/app/unknown/path').state.location.pathname).toBe('/app');
  });
});
