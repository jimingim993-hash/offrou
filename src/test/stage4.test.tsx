import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '@/app/router';
import { getExperience } from '@/services/experiences';
import { addRecord, getRecords } from '@/services/records';
import { getFeedback, setFeedback } from '@/services/feedback';
import { getSaved, toggleSaved } from '@/services/saved';
import { candidatesFor } from '@/services/recommendation';
import { findDuration } from '@/data/durations';

const renderAt = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
};

const pickOf = (router: ReturnType<typeof renderAt>['router']) =>
  new URLSearchParams(router.state.location.search).get('pick');

describe('완료 후 가벼운 피드백', () => {
  it('좋았어 / 그냥 그랬어를 남기고 바꿀 수 있다', async () => {
    const user = userEvent.setup();
    renderAt('/app/experience/rest-window/play');
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));

    expect(screen.getByText('이 시간은 어땠어?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '좋았어' }));
    expect(screen.getByRole('button', { name: '좋았어' })).toHaveAttribute('aria-pressed', 'true');
    expect(getFeedback()).toMatchObject([{ experienceId: 'rest-window', value: 'good', recordId: getRecords()[0].id }]);

    await user.click(screen.getByRole('button', { name: '그냥 그랬어' }));
    expect(getFeedback()).toMatchObject([{ value: 'meh' }]);
    expect(screen.getByText(/알려줘서 고마워/)).toBeInTheDocument();
  });

  it('피드백 없이 HOME으로 돌아갈 수 있다', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/app/experience/play-doodle/play');
    await user.click(screen.getByRole('button', { name: /나가기/ }));
    await user.click(screen.getByRole('button', { name: '여기까지 하고 마치기' }));
    await user.click(screen.getByRole('button', { name: 'HOME으로 돌아가기' }));
    expect(router.state.location.pathname).toBe('/app');
    expect(getRecords()).toHaveLength(1);
    expect(getFeedback()).toHaveLength(0);
  });

  it('EXPERIENCE도 결말과 함께 피드백을 남길 수 있다 (선택 내용은 저장하지 않음)', async () => {
    const user = userEvent.setup();
    renderAt('/app/experience/exp-detective/play');
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(screen.getByRole('button', { name: '영수증' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(screen.getByRole('button', { name: '대학생의 가방이다' }));
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    await user.click(screen.getByRole('button', { name: '좋았어' }));

    const stored = JSON.stringify(localStorage);
    expect(stored).not.toMatch(/student|receipt|대학생|영수증/);
    expect(getRecords()[0]).toMatchObject({ experienceId: 'exp-detective', kind: 'story' });
  });
});

describe('추천 결과', () => {
  it('짧은 추천 이유를 보여준다', async () => {
    renderAt('/app/ready?mood=rest&time=10m');
    expect(await screen.findByText('지금 10분이면 충분해.')).toBeInTheDocument();
  });

  it('다른 시간 보기를 계속 눌러도 후보를 한 바퀴 돌기 전엔 겹치지 않는다', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/app/ready?mood=rest&time=10m');
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    const total = candidatesFor('rest', findDuration('10m')!).length;

    const seen = [pickOf(router)];
    for (let i = 1; i < total; i++) {
      await user.click(screen.getByRole('button', { name: /다른 시간 보기/ }));
      seen.push(pickOf(router));
    }
    expect(new Set(seen).size).toBe(total);

    // 다 본 뒤에도 자연스럽게 계속 (직전과는 다르게)
    await user.click(screen.getByRole('button', { name: /다른 시간 보기/ }));
    expect(pickOf(router)).not.toBe(seen[seen.length - 1]);
  });

  it('기록이 쌓이면 "평소와 조금 다른 걸 해볼래?"를 제안하고, 누르면 다른 종류를 우선한다', async () => {
    const user = userEvent.setup();
    addRecord(getExperience('rest-window')!);
    addRecord(getExperience('rest-two-songs')!);
    const { router } = renderAt('/app/ready?mood=rest&time=10m');

    await user.click(await screen.findByRole('button', { name: /평소와 조금 다른 걸 해볼래/ }));
    expect(new URLSearchParams(router.state.location.search).get('fresh')).toBe('1');
    expect(screen.getByText('평소와 조금 다른 시간이야.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /평소와 조금 다른 걸 해볼래/ })).not.toBeInTheDocument();
  });

  it('처음 방문한 사용자에게는 제안하지 않는다', async () => {
    renderAt('/app/ready?mood=rest&time=10m');
    await screen.findByRole('button', { name: '이 시간 시작하기' });
    expect(screen.queryByRole('button', { name: /평소와 조금 다른 걸 해볼래/ })).not.toBeInTheDocument();
  });
});

describe('♡ 저장', () => {
  it('상세에서 저장 → MY 저장한 시간에 보이고, 취소하면 사라진다', async () => {
    const user = userEvent.setup();
    const { router, unmount } = renderAt('/app/experience/out-sky');
    const save = screen.getByRole('button', { name: '저장' });
    await user.click(save);
    expect(screen.getByRole('button', { name: '저장됨' })).toHaveAttribute('aria-pressed', 'true');
    expect(getSaved().map((s) => s.experienceId)).toEqual(['out-sky']);

    // 새로고침해도 유지
    unmount();
    renderAt('/app/my?tab=saved');
    expect(screen.getByRole('tab', { name: /저장한 시간/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('문 밖에서 하늘 보기')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '문 밖에서 하늘 보기 저장됨' }));
    expect(screen.getByText('아직 저장해둔 시간이 없어.')).toBeInTheDocument();
    expect(getSaved()).toEqual([]);
    expect(router).toBeDefined();
  });

  it('발견 목록에서도 바로 저장할 수 있다', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/app/discover/hobby');
    await user.click(screen.getByRole('button', { name: '10분 드로잉 저장' }));
    expect(router.state.location.pathname).toBe('/app/discover/hobby'); // 저장만 하고 이동하지 않음
    expect(screen.getByRole('button', { name: '10분 드로잉 저장됨' })).toBeInTheDocument();
  });
});

describe('MY OFFROU', () => {
  it('이번 달 횟수 · 카테고리별 횟수 · 자주 보낸 시간', () => {
    for (const id of ['rest-window', 'exp-radio-dj', 'rest-two-songs', 'exp-detective']) addRecord(getExperience(id)!);
    renderAt('/app/my');
    expect(screen.getByText(/이번 달, 다른 시간을/).textContent).toBe('이번 달, 다른 시간을 4번 보냈어.');
    const counts = screen.getByRole('list', { name: '이번 달 카테고리별 횟수' });
    expect(within(counts).getAllByRole('listitem').map((li) => li.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '☁️ REST 2',
      '🎭 EXPERIENCE 2',
    ]);
    expect(screen.getByText('요즘 네가 자주 보낸 시간')).toBeInTheDocument();
    expect(screen.getByText('쉬기')).toBeInTheDocument();
  });

  it('기록이 적으면 취향 대신 안내만 보여준다', () => {
    addRecord(getExperience('rest-window')!);
    renderAt('/app/my');
    expect(screen.getByText('조금 더 여러 시간을 보내보면 여기에 네 취향이 보여.')).toBeInTheDocument();
  });

  it('기록이 없으면 기존 빈 상태 그대로', () => {
    renderAt('/app/my');
    expect(screen.getByText('아직 남겨진 시간이 없어.')).toBeInTheDocument();
    expect(screen.queryByText(/이번 달/)).not.toBeInTheDocument();
  });
});

describe('내 OFFROU 기록 초기화', () => {
  it('확인을 거쳐 모두 지우고, 처음 방문한 상태로 돌아간다', async () => {
    const user = userEvent.setup();
    const r = addRecord(getExperience('rest-window')!);
    addRecord(getExperience('rest-two-songs')!);
    setFeedback(r, 'good');
    toggleSaved('out-sky');
    const { unmount } = renderAt('/app/my');

    await user.click(screen.getByRole('button', { name: '내 OFFROU 기록 초기화' }));
    const dialog = screen.getByRole('dialog', { name: '내 OFFROU 기록을 모두 지울까?' });

    // 그만두면 아무것도 지워지지 않는다
    await user.click(within(dialog).getByRole('button', { name: '그만둘래' }));
    expect(getRecords()).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: '내 OFFROU 기록 초기화' }));
    await user.click(screen.getByRole('button', { name: '모두 지우기' }));

    expect(screen.getByText('아직 남겨진 시간이 없어.')).toBeInTheDocument();
    expect(screen.getByText(/모두 지웠어/)).toBeInTheDocument();
    expect(Object.keys(localStorage).filter((k) => k.startsWith('offrou.'))).toEqual([]);

    // 신규 사용자처럼 추천받는다
    unmount();
    renderAt('/app/ready?mood=rest&time=10m');
    expect(await screen.findByText('지금 10분이면 충분해.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /평소와 조금 다른 걸 해볼래/ })).not.toBeInTheDocument();
  });
});
