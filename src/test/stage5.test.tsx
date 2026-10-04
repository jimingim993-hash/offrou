import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '@/app/router';
import { CATEGORIES } from '@/data/categories';
import { getExperience, listExperiences } from '@/services/experiences';
import { EMPTY_FILTER, searchExperiences } from '@/services/discovery';
import { addRecord } from '@/services/records';
import { getSaved } from '@/services/saved';
import { PAGE_SIZE } from '@/features/discover/ResultList';

const renderAt = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
};

const all = listExperiences();
const resultList = () => screen.getByRole('list', { name: '경험 목록' });
/** 결과 카드의 경험 제목들 */
const shownTitles = () =>
  within(resultList())
    .getAllByRole('link')
    .map((a) => all.find((e) => a.getAttribute('href') === `/app/experience/${e.id}`)!.title);
const countText = () => screen.getByText(/개의 시간$|맞는 시간이 없어/).textContent;
const search = () => screen.getByRole('searchbox', { name: 'OFFROU 시간 검색' });

describe('발견: 전체와 카테고리', () => {
  it('전체 콘텐츠를 조금씩(더 보기) 보여준다', async () => {
    const user = userEvent.setup();
    renderAt('/app/discover');
    expect(screen.getByRole('heading', { name: '어떤 시간을 보내볼까?' })).toBeInTheDocument();
    expect(countText()).toBe(`${all.length}개의 시간`);
    expect(within(resultList()).getAllByRole('listitem')).toHaveLength(PAGE_SIZE);

    while (screen.queryByRole('button', { name: /더 보기/ })) await user.click(screen.getByRole('button', { name: /더 보기/ }));
    expect(within(resultList()).getAllByRole('listitem')).toHaveLength(all.length);
  });

  it.each(CATEGORIES.map((c) => [c.code, c] as const))('%s 필터', async (_, c) => {
    const user = userEvent.setup();
    const { router } = renderAt('/app/discover');
    const nav = screen.getByRole('navigation', { name: '카테고리' });
    const tab = within(nav).getByRole('link', { name: new RegExp(c.code) });
    expect(tab).toHaveTextContent(c.short);
    await user.click(tab);

    expect(router.state.location.pathname).toBe(`/app/discover/${c.id}`);
    // 경로가 바뀌면 화면이 새로 그려지므로 다시 찾는다
    const navAfter = screen.getByRole('navigation', { name: '카테고리' });
    expect(within(navAfter).getByRole('link', { name: new RegExp(c.code) })).toHaveAttribute('aria-current', 'page');
    const size = all.filter((e) => e.categoryId === c.id).length;
    expect(countText()).toBe(`${size}개의 시간`);
    for (const title of shownTitles()) expect(all.find((e) => e.title === title)!.categoryId).toBe(c.id);
  });
});

describe('발견: 검색', () => {
  it('제목·설명·태그로 찾고, 검색어를 지우면 처음으로', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/app/discover');

    await user.type(search(), '심야');
    expect(shownTitles()).toContain('심야 라디오 DJ');
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('심야');

    await user.clear(search());
    await user.type(search(), '그럴듯한'); // 설명에만 있는 말
    expect(shownTitles()).toEqual(['책상 위 작은 박물관']);

    await user.clear(search());
    await user.type(search(), '조용'); // 태그
    expect(shownTitles().length).toBeGreaterThan(3);

    await user.click(screen.getByRole('button', { name: '검색어 지우기' }));
    expect(search()).toHaveValue('');
    expect(countText()).toBe(`${all.length}개의 시간`);
    expect(new URLSearchParams(router.state.location.search).has('q')).toBe(false);
  });

  it('검색 중에는 "처음 만나는 시간"을 숨긴다', async () => {
    const user = userEvent.setup();
    renderAt('/app/discover');
    expect(screen.getByRole('heading', { name: /처음 만나는 시간/ })).toBeInTheDocument();
    await user.type(search(), '산책');
    expect(screen.queryByRole('heading', { name: /처음 만나는 시간/ })).not.toBeInTheDocument();
  });
});

describe('발견: 시간·장소 필터', () => {
  it('시간 필터', async () => {
    const user = userEvent.setup();
    renderAt('/app/discover');
    const time = screen.getByRole('group', { name: '시간' });
    await user.click(within(time).getByRole('button', { name: '10분' }));
    expect(within(time).getByRole('button', { name: '10분' })).toHaveAttribute('aria-pressed', 'true');
    const expected = all.filter((e) => e.minutes <= 10).length;
    expect(countText()).toBe(`${expected}개의 시간`);
    for (const title of shownTitles()) expect(all.find((e) => e.title === title)!.minutes).toBeLessThanOrEqual(10);

    await user.click(within(time).getByRole('button', { name: '전체' }));
    expect(countText()).toBe(`${all.length}개의 시간`);
  });

  it('장소 필터', async () => {
    const user = userEvent.setup();
    renderAt('/app/discover');
    const place = screen.getByRole('group', { name: '장소' });
    await user.click(within(place).getByRole('button', { name: '밖에서' }));
    for (const title of shownTitles()) expect(all.find((e) => e.title === title)!.place).toBe('outside');
    await user.click(within(place).getByRole('button', { name: '집에서' }));
    for (const title of shownTitles()) expect(all.find((e) => e.title === title)!.place).not.toBe('outside');
  });

  it('여러 조건 조합 + 새로고침해도 유지', async () => {
    const user = userEvent.setup();
    const { router, unmount } = renderAt('/app/discover/hobby');
    await user.click(within(screen.getByRole('group', { name: '시간' })).getByRole('button', { name: '10분' }));
    await user.click(within(screen.getByRole('group', { name: '장소' })).getByRole('button', { name: '집에서' }));
    await user.type(search(), '그림');
    expect(shownTitles()).toEqual(['10분 드로잉']);

    const url = router.state.location.pathname + router.state.location.search;
    unmount();
    renderAt(url);
    expect(search()).toHaveValue('그림');
    expect(shownTitles()).toEqual(['10분 드로잉']);
  });

  it('카테고리를 바꿔도 검색·시간 조건은 유지된다', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/app/discover?time=5m');
    await user.click(within(screen.getByRole('navigation', { name: '카테고리' })).getByRole('link', { name: /PLAY/ }));
    expect(router.state.location.pathname).toBe('/app/discover/play');
    expect(new URLSearchParams(router.state.location.search).get('time')).toBe('5m');
  });
});

describe('발견: 결과 없음', () => {
  it('없다고 분명히 말하고, "대신" 1~3개를 따로 제안한다', async () => {
    const user = userEvent.setup();
    renderAt('/app/discover/hobby');
    await user.type(search(), 'zzqqxx');

    expect(screen.getByText('그런 시간은 아직 준비하지 못했어.')).toBeInTheDocument();
    expect(countText()).toBe('맞는 시간이 없어');
    expect(screen.queryByRole('list', { name: '경험 목록' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /아무거나 하나/ })).toBeDisabled();

    const suggestions = within(screen.getByRole('list', { name: '대신 제안하는 시간' })).getAllByRole('listitem');
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    expect(suggestions.length).toBeLessThanOrEqual(3);
    expect(screen.getByText('대신 이런 건 어때?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '검색·필터 지우기' }));
    expect(countText()).toBe(`${all.length}개의 시간`);
  });
});

describe('발견 → 상세 → 시작', () => {
  it('카드를 누르면 상세(바로 실행 X), 상세에서 시작', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/app/discover/out');
    await user.click(within(resultList()).getByRole('link', { name: /안 가던 길로 10분/ }));

    expect(router.state.location.pathname).toBe('/app/experience/out-new-route');
    expect(screen.getByRole('heading', { level: 1, name: '안 가던 길로 10분' })).toBeInTheDocument();
    expect(screen.getByText(/밖으로 나가는 시간/)).toBeInTheDocument();
    const meta = screen.getByRole('list', { name: '경험 정보' });
    for (const t of ['약 10분', '밖에서', '비용 없음', '혼자 가능', '준비물 · 편한 신발']) expect(within(meta).getByText(t)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe('/app/experience/out-new-route/play');
  });
});

describe('저장: 화면 간 동기화', () => {
  it('발견에서 저장 → 상세·MY에 반영 → MY에서 취소 → 발견에 반영', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/app/discover/experience');

    await user.click(screen.getByRole('button', { name: '심야 라디오 DJ 저장' }));
    expect(getSaved().map((s) => s.experienceId)).toEqual(['exp-radio-dj']);

    await user.click(within(resultList()).getByRole('link', { name: /심야 라디오 DJ/ }));
    expect(screen.getByRole('button', { name: '저장됨' })).toHaveAttribute('aria-pressed', 'true');

    await router.navigate('/app/my?tab=saved');
    await screen.findByRole('tab', { name: /저장한 시간/, selected: true });
    expect(screen.getByText('심야 라디오 DJ')).toBeInTheDocument();

    // 저장 항목 → 상세 → 시작
    await user.click(screen.getByRole('link', { name: /심야 라디오 DJ/ }));
    expect(router.state.location.pathname).toBe('/app/experience/exp-radio-dj');
    await router.navigate('/app/my?tab=saved');
    await user.click(await screen.findByRole('button', { name: '심야 라디오 DJ 저장됨' }));
    expect(screen.getByText('아직 저장해둔 시간이 없어.')).toBeInTheDocument();
    expect(screen.getByText('발견하다 마음에 드는 시간이 있으면 ♡를 눌러봐.')).toBeInTheDocument();

    await router.navigate('/app/discover/experience');
    expect(await screen.findByRole('button', { name: '심야 라디오 DJ 저장' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('저장 항목에서 상세로 가서 바로 시작할 수 있다', async () => {
    const user = userEvent.setup();
    localStorage.setItem('offrou.saved.v1', JSON.stringify([{ experienceId: 'hobby-drawing', savedAt: '2026-10-01T00:00:00.000Z' }]));
    const { router } = renderAt('/app/my?tab=saved');
    await user.click(screen.getByRole('link', { name: /10분 드로잉/ }));
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(router.state.location.pathname).toBe('/app/experience/hobby-drawing/play');
  });
});

describe('🎲 아무거나 하나', () => {
  it('필터가 없으면 전체 중 하나의 상세로', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/app/discover');
    await user.click(screen.getByRole('button', { name: /아무거나 하나/ }));
    const id = router.state.location.pathname.replace('/app/experience/', '');
    expect(getExperience(id)).toBeDefined();
  });

  it('현재 필터 안에서만 고른다', async () => {
    const user = userEvent.setup();
    const allowed = searchExperiences({ ...EMPTY_FILTER, category: 'out', time: '5m' }).map((e) => `/app/experience/${e.id}`);
    for (let i = 0; i < 10; i++) {
      const { router, unmount } = renderAt('/app/discover/out?time=5m');
      await user.click(screen.getByRole('button', { name: /아무거나 하나/ }));
      expect(allowed).toContain(router.state.location.pathname);
      unmount();
    }
  });
});

describe('처음 만나는 시간', () => {
  it('아직 완료하지 않은 경험 하나만 보여준다', () => {
    const untried = getExperience('play-tiny-museum')!;
    for (const e of all) if (e !== untried) addRecord(e);
    renderAt('/app/discover');
    const section = screen.getByRole('region', { name: /처음 만나는 시간/ });
    expect(within(section).getAllByRole('link')).toHaveLength(1);
    expect(within(section).getByRole('link')).toHaveAttribute('href', `/app/experience/${untried.id}`);
  });

  it('카테고리·필터를 고르면 목록과 겹치지 않도록 숨긴다', () => {
    renderAt('/app/discover/play');
    expect(screen.queryByRole('region', { name: /처음 만나는 시간/ })).not.toBeInTheDocument();
  });

  it('신규 사용자에게도 하나를 보여준다', () => {
    renderAt('/app/discover');
    const section = screen.getByRole('region', { name: /처음 만나는 시간/ });
    expect(within(section).getAllByRole('link')).toHaveLength(1);
  });
});

describe('최근 본 시간', () => {
  it('상세를 열어본 경험이 최근 순으로 최대 5개, 시작하면 빠진다', async () => {
    const user = userEvent.setup();
    const opened = all.slice(0, 6);
    const { router } = renderAt('/app/discover');
    for (const e of opened) {
      await router.navigate(`/app/experience/${e.id}`);
      await screen.findByRole('heading', { level: 1, name: e.title });
    }
    await router.navigate('/app/discover');

    const recent = await screen.findByRole('region', { name: '최근 본 시간' });
    const links = within(recent).getAllByRole('link');
    expect(links).toHaveLength(5);
    expect(links[0]).toHaveAttribute('href', `/app/experience/${opened[5].id}`);
    expect(links.map((a) => a.getAttribute('href'))).not.toContain(`/app/experience/${opened[0].id}`);

    // 시작하면 목록에서 빠진다
    await user.click(links[0]);
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    await router.navigate('/app/discover');
    const after = within(await screen.findByRole('region', { name: '최근 본 시간' })).getAllByRole('link');
    expect(after.map((a) => a.getAttribute('href'))).not.toContain(`/app/experience/${opened[5].id}`);
  });
});

describe('기존 데이터 호환', () => {
  it('이전 단계의 MY 기록이 그대로 보인다', () => {
    localStorage.setItem(
      'offrou.records.v1',
      JSON.stringify([
        { id: 'old1', experienceId: 'exp-radio-dj', title: '심야 라디오 DJ', categoryId: 'experience', minutes: 15, completedAt: new Date().toISOString(), endingTitle: '조용한 밤의 방송' },
        { id: 'old2', experienceId: 'rest-window', title: '창밖 바라보기', categoryId: 'rest', minutes: 5, completedAt: new Date().toISOString() },
      ]),
    );
    renderAt('/app/my');
    expect(screen.getByText('“조용한 밤의 방송”')).toBeInTheDocument();
    expect(screen.getByText('창밖 바라보기')).toBeInTheDocument();
    expect(screen.getByText(/이번 달, 다른 시간을/).textContent).toBe('이번 달, 다른 시간을 2번 보냈어.');
  });
});

describe('접근성 기본', () => {
  it('발견 화면의 입력·버튼·링크에 모두 이름이 있다', async () => {
    const user = userEvent.setup();
    renderAt('/app/discover');
    await user.type(search(), '밤');
    expect(search()).toHaveAccessibleName('OFFROU 시간 검색');
    for (const el of [...screen.getAllByRole('button'), ...screen.getAllByRole('link')]) {
      expect(el).toHaveAccessibleName();
    }
    // 아이콘만 있는 버튼
    expect(screen.getByRole('button', { name: '검색어 지우기' })).toBeInTheDocument();
    for (const b of screen.getAllByRole('button', { name: / 저장(됨)?$/ })) expect(b).toHaveAttribute('aria-pressed');
    // 필터는 선택 상태를 알려준다
    for (const b of within(screen.getByRole('group', { name: '시간' })).getAllByRole('button')) {
      expect(b).toHaveAttribute('aria-pressed');
    }
  });
});
