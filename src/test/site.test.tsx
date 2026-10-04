/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '@/app/router';
import { CATEGORIES } from '@/data/categories';
import { SITE_HOW_EXAMPLE_ID, SITE_INFO, SITE_SHOWCASE_IDS, SITE_STORY_IDS } from '@/data/site';
import { STORIES } from '@/data/stories';
import { getExperience } from '@/services/experiences';
import { addRecord } from '@/services/records';
import { toggleSaved } from '@/services/saved';
import { setBackendForTesting } from '@/services/account/backend';
import { buildSeoTags, injectSeoTags } from '../../seo-meta';
import { FakeServer } from './fakeBackend';

const renderAt = (path: string) => {
  cleanup();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};

/** 홈페이지는 따로 불러오므로(lazy) 대표 문구가 뜰 때까지 기다린다 */
const openSite = async (path = '/') => {
  const router = renderAt(path);
  await screen.findByRole('heading', { level: 1, name: '같은 하루에, 다른 시간을.' });
  return router;
};

const root = process.cwd();

describe('공식 홈페이지 (/)', () => {
  it('대표 문구와 기본 구조(헤더·본문·푸터, h1 하나)', async () => {
    await openSite();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText(/반복되는 하루에서 잠시 벗어나/)).toBeInTheDocument();
    expect(document.title).toBe('OFFROU | 같은 하루에, 다른 시간을');
    // 모든 섹션 제목은 h2
    for (const name of [
      '이런 순간 있지 않아?',
      '고민은 짧게, 시간은 다르게.',
      'OFFROU가 건네는 다섯 가지 시간',
      '이런 시간을 보낼 수 있어.',
      '잠깐 다른 사람이 되어보는 것도 괜찮아.',
      '여기서는 잘하지 않아도 돼.',
      '지나온 시간은 조용히 남겨둘게.',
      '가입하지 않아도 괜찮아.',
      'OFFROU와 이야기하고 싶다면',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByText('그럴 때 OFFROU를 열어봐.')).toBeInTheDocument();
    expect(screen.getByText(/OFFROU는 사람에게 새로운 시간을 제공한다/)).toBeInTheDocument();
  });

  it('"OFFROU 시작하기" → 회원가입 없이 실제 서비스 HOME', async () => {
    const user = userEvent.setup();
    const router = await openSite();
    const ctas = screen.getAllByRole('link', { name: 'OFFROU 시작하기' });
    expect(ctas.length).toBeGreaterThanOrEqual(2);
    for (const a of ctas) expect(a).toHaveAttribute('href', '/app');

    await user.click(within(screen.getByRole('main')).getAllByRole('link', { name: 'OFFROU 시작하기' })[0]);
    expect(router.state.location.pathname).toBe('/app');
    expect(await screen.findByText('지금 어떤 시간이 필요해?')).toBeInTheDocument();
    expect(document.title).toBe('OFFROU 오프루');
  });

  it('헤더 메뉴와 보조 CTA는 페이지 안 영역으로 이동한다', async () => {
    await openSite();
    const nav = screen.getByRole('navigation', { name: '홈페이지' });
    const hrefs = within(nav).getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['#service', '#times', '#brand', '#contact']);
    for (const h of [...hrefs, '#times', '#top', '#main']) {
      expect(document.getElementById(h!.slice(1)), h!).not.toBeNull();
    }
    expect(screen.getByRole('link', { name: '어떤 시간이 있는지 보기' })).toHaveAttribute('href', '#times');
  });

  it('모바일 메뉴: 열고 닫기 (Esc, 항목 선택)', async () => {
    const user = userEvent.setup();
    await openSite();
    const button = screen.getByRole('button', { name: '메뉴 열기' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(screen.getByRole('button', { name: '메뉴 닫기' })).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('navigation', { name: '홈페이지 메뉴' });
    expect(within(menu).getAllByRole('link')).toHaveLength(4);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: '홈페이지 메뉴' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '메뉴 열기' }));
    await user.click(within(screen.getByRole('navigation', { name: '홈페이지 메뉴' })).getByRole('link', { name: '브랜드' }));
    expect(screen.queryByRole('navigation', { name: '홈페이지 메뉴' })).not.toBeInTheDocument();
  });
});

describe('홈페이지 ↔ 실제 콘텐츠 데이터', () => {
  it('다섯 가지 시간은 카테고리 데이터에서, 각각 발견으로 연결', async () => {
    await openSite();
    const section = screen.getByRole('region', { name: 'OFFROU가 건네는 다섯 가지 시간' });
    for (const c of CATEGORIES) {
      expect(within(section).getByRole('heading', { level: 3, name: c.short })).toBeInTheDocument();
      expect(within(section).getByText(c.intro)).toBeInTheDocument();
      expect(within(section).getByRole('link', { name: `${c.code} ${c.short} 둘러보기` })).toHaveAttribute('href', `/app/discover/${c.id}`);
    }
  });

  it('미리보기는 실제 경험 3~6개, 각 상세로 연결', async () => {
    await openSite();
    const section = screen.getByRole('region', { name: '이런 시간을 보낼 수 있어.' });
    const links = within(section).getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);
    expect(links.length).toBeLessThanOrEqual(6);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(SITE_SHOWCASE_IDS.map((id) => `/app/experience/${id}`));
    for (const id of SITE_SHOWCASE_IDS) {
      const e = getExperience(id)!;
      expect(within(section).getByRole('heading', { level: 3, name: e.title })).toBeInTheDocument();
      expect(within(section).getByText(e.invite)).toBeInTheDocument();
    }
  });

  it('콘텐츠 데이터가 바뀌면 홈페이지도 따라간다 (복사본 없음)', async () => {
    const e = getExperience(SITE_SHOWCASE_IDS[0])!;
    const original = e.title;
    e.title = '바뀐 제목으로 확인';
    try {
      await openSite();
      expect(screen.getByRole('heading', { level: 3, name: '바뀐 제목으로 확인' })).toBeInTheDocument();
    } finally {
      e.title = original;
    }
  });

  it('사용 방식 예시·이야기 목록·이야기 수도 실제 데이터', async () => {
    await openSite();
    expect(screen.getByText(getExperience(SITE_HOW_EXAMPLE_ID)!.invite)).toBeInTheDocument();
    const stories = screen.getByRole('list', { name: 'EXPERIENCE 이야기 예시' });
    expect(within(stories).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(
      SITE_STORY_IDS.map((id) => `/app/experience/${id}`),
    );
    expect(screen.getByText(`지금 ${STORIES.length}개의 이야기가 기다리고 있어.`)).toBeInTheDocument();
  });

  it('EXPERIENCE 만나보기 → 실제 EXPERIENCE 발견 화면', async () => {
    const user = userEvent.setup();
    const router = await openSite();
    await user.click(screen.getByRole('link', { name: 'EXPERIENCE 만나보기' }));
    expect(router.state.location.pathname).toBe('/app/discover/experience');
    const tabs = await screen.findByRole('navigation', { name: '카테고리' });
    expect(within(tabs).getByRole('link', { name: /EXPERIENCE/ })).toHaveAttribute('aria-current', 'page');
  });
});

describe('확정되지 않은 정보는 만들지 않는다', () => {
  it('문의: 연락처가 없으면 준비 중, 있으면 메일 연결', async () => {
    await openSite();
    const contact = screen.getByRole('region', { name: 'OFFROU와 이야기하고 싶다면' });
    expect(within(contact).queryAllByRole('link')).toHaveLength(0);
    expect(within(contact).getByText(/문의 창구를 준비하고 있어요/)).toBeInTheDocument();
    for (const t of ['서비스 문의', '콘텐츠 제안', '제휴 문의', '기타 문의']) expect(within(contact).getByText(t)).toBeInTheDocument();

    SITE_INFO.contact.email = 'hello@offrou.invalid';
    try {
      await openSite();
      const links = within(screen.getByRole('region', { name: 'OFFROU와 이야기하고 싶다면' })).getAllByRole('link');
      expect(links[0].getAttribute('href')).toMatch(/^mailto:hello@offrou\.invalid\?subject=/);
    } finally {
      SITE_INFO.contact.email = null;
    }
  });

  it('푸터: 회사 정보·약관이 없으면 표시하지 않거나 준비 중', async () => {
    await openSite();
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText('같은 하루에, 다른 시간을.')).toBeInTheDocument();
    expect(within(footer).getByText('개인정보처리방침 (준비 중)')).toBeInTheDocument();
    expect(within(footer).queryByRole('link', { name: /개인정보처리방침|이용약관/ })).not.toBeInTheDocument();
    expect(footer.querySelector('address')).toBeNull();
    expect(within(footer).getByRole('link', { name: '서비스' })).toHaveAttribute('href', '/app');

    SITE_INFO.company.legalName = '테스트 상호';
    try {
      await openSite();
      expect(screen.getByRole('contentinfo').querySelector('address')).toHaveTextContent('상호 테스트 상호');
    } finally {
      SITE_INFO.company.legalName = null;
    }
  });
});

describe('서비스 ↔ 홈페이지, 예전 주소', () => {
  it('MY의 작은 "OFFROU 소개"로 홈페이지에 갈 수 있다', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app/my');
    await user.click(await screen.findByRole('link', { name: 'OFFROU 소개' }));
    expect(router.state.location.pathname).toBe('/');
    expect(await screen.findByRole('heading', { level: 1, name: '같은 하루에, 다른 시간을.' })).toBeInTheDocument();
  });

  it.each([
    ['/my', '/app/my', ''],
    ['/discover/out?time=5m', '/app/discover/out', '?time=5m'],
    ['/experience/rest-window/play?mood=rest&time=5m', '/app/experience/rest-window/play', '?mood=rest&time=5m'],
    ['/ready?mood=rest&time=10m', '/app/ready', '?mood=rest&time=10m'],
    ['/account?mode=login', '/app/account', '?mode=login'],
  ])('예전 주소 %s → %s (쿼리 유지)', async (from, to, search) => {
    const router = renderAt(from);
    await waitFor(() => expect(router.state.location.pathname).toBe(to));
    // 원래 쿼리는 그대로 (추천 화면은 그 뒤에 &pick=…을 덧붙인다)
    expect(router.state.location.search.startsWith(search)).toBe(true);
  });

  it('인증 메일 링크(해시 포함)도 /app으로 그대로 넘긴다', async () => {
    const router = renderAt('/account/reset#access_token=abc&type=recovery');
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/account/reset'));
    expect(router.state.location.hash).toBe('#access_token=abc&type=recovery');
  });

  it('모르는 주소: 서비스 안이면 서비스 HOME, 밖이면 홈페이지', async () => {
    expect(renderAt('/app/nope').state.location.pathname).toBe('/app');
    const router = renderAt('/nope/deeper');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});

describe('기존 데이터·로그인 상태 유지', () => {
  afterEach(() => setBackendForTesting(undefined));

  it('홈페이지를 거쳐도 기존 기록·저장은 그대로', async () => {
    const user = userEvent.setup();
    addRecord(getExperience('rest-window')!);
    toggleSaved('out-sky');
    const before = JSON.stringify(localStorage);
    const router = await openSite();
    expect(JSON.stringify(localStorage)).toBe(before);

    await user.click(screen.getAllByRole('link', { name: 'OFFROU 시작하기' })[0]);
    await router.navigate('/app/my');
    expect(await screen.findByText('창밖 바라보기')).toBeInTheDocument();
  });

  it('로그인한 채 홈페이지에 들어와도 세션을 건드리지 않고, 돌아오면 그대로 로그인 상태', async () => {
    const user = userEvent.setup();
    const server = new FakeServer();
    setBackendForTesting(server.createDevice());
    renderAt('/app/account?mode=signup');
    await user.type(await screen.findByLabelText('이메일'), 'me@offrou.app');
    await user.type(screen.getByLabelText('비밀번호'), 'long-enough-1');
    await user.click(screen.getByRole('button', { name: 'OFFROU 시작하기' }));
    await screen.findByText('OFFROU가 이어지고 있어.');

    // 홈페이지는 계정 코드를 불러오지 않는다 (세션 조회 없음)
    const device = server.createDevice();
    const getUser = vi.spyOn(device, 'getUser');
    setBackendForTesting(device);
    const router = await openSite();
    expect(getUser).not.toHaveBeenCalled();
    expect(localStorage.getItem('fake-auth-session')).not.toBeNull();

    await router.navigate('/app/my');
    expect(await screen.findByText('OFFROU가 이어지고 있어.')).toBeInTheDocument();
  });
});

describe('접근성·움직임', () => {
  it('키보드: 본문 건너뛰기 → 워드마크 → 메뉴 → 시작하기 순서로 이동', async () => {
    const user = userEvent.setup();
    await openSite();
    await user.tab();
    expect(document.activeElement).toHaveTextContent('본문으로 건너뛰기');
    await user.tab();
    expect(document.activeElement).toHaveAccessibleName('OFFROU 맨 위로');
    await user.tab();
    expect(document.activeElement).toHaveTextContent('서비스');
    for (let i = 0; i < 3; i++) await user.tab();
    await user.tab();
    expect(document.activeElement).toHaveTextContent('OFFROU 시작하기');
    for (const el of [...screen.getAllByRole('link'), ...screen.getAllByRole('button')]) expect(el).toHaveAccessibleName();
  });

  it('움직임 줄이기 설정이면 스크롤 등장 효과를 쓰지 않는다', async () => {
    const observe = vi.fn();
    class FakeIO {
      observe = observe;
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', FakeIO);

    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }));
    await openSite();
    expect(observe).not.toHaveBeenCalled();

    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
    await openSite();
    expect(observe).toHaveBeenCalled();
    vi.unstubAllGlobals();

    const css = readFileSync(join(root, 'src/features/site/site.module.css'), 'utf8');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.reveal \{\s*opacity: 1;/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.hero::before/);
  });
});

describe('SEO·PWA 설정 (정적)', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const manifest = JSON.parse(readFileSync(join(root, 'public/manifest.webmanifest'), 'utf8'));

  it('기본 meta·Open Graph, 가짜 canonical/이미지 없음', () => {
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('<title>OFFROU | 같은 하루에, 다른 시간을</title>');
    expect(html).toMatch(/name="description"\s+content="반복되는 일상에서 잠시 벗어나 평소와 다른 시간을 만나보세요\. OFFROU는 휴식, 놀이, 취미, 경험과 작은 외출을 제안합니다\."/);
    for (const p of ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:locale']) expect(html).toContain(`property="${p}"`);
    expect(html).not.toMatch(/rel="canonical"|property="og:url"|property="og:image"/);
    expect(html).toContain('rel="icon"');
    expect(html).toContain('rel="manifest"');
  });

  it('배포 주소·이미지가 주어질 때만 canonical·og:url·og:image를 넣는다', () => {
    expect(buildSeoTags({})).toEqual([]);
    expect(buildSeoTags({ siteUrl: 'not a url' })).toEqual([]);
    expect(buildSeoTags({ ogImage: '/og.png' })).toEqual([]); // 주소 없이 상대 경로는 못 만든다
    const tags = buildSeoTags({ siteUrl: 'https://offrou.example/', ogImage: '/og/offrou.png' });
    expect(tags).toContain('<link rel="canonical" href="https://offrou.example/" />');
    expect(tags).toContain('<meta property="og:url" content="https://offrou.example/" />');
    expect(tags).toContain('<meta property="og:image" content="https://offrou.example/og/offrou.png" />');
    const out = injectSeoTags(html, { siteUrl: 'https://offrou.example', ogImage: 'https://cdn.example/a".png' });
    expect(out).toContain('content="https://cdn.example/a&quot;.png"');
    expect(out).toContain('name="twitter:card" content="summary_large_image"');
  });

  it('PWA는 설치 후 서비스 HOME(/app)으로 바로 열린다', () => {
    expect(manifest.start_url).toBe('/app');
    expect(manifest.scope).toBe('/');
    expect(manifest.id).toBe('/'); // 기존 설치와 같은 앱으로 유지
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});
