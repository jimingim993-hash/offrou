/// <reference types="node" />
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { routes } from '@/app/router';
import { STORAGE_KEYS } from '@/services/storage';
import { CURRENT_STORAGE_VERSION, runStorageMigrations } from '@/services/storageMigrations';
import { getContentVersion, getExperience, getStory } from '@/services/experiences';
import { addRecord, getRecords } from '@/services/records';
import { getSaved, toggleSaved } from '@/services/saved';
import { RECENT_LIMIT, getRecentRaw, noteRecent } from '@/services/recent';
import { getCourseResume, getStoryResume, saveStoryResume } from '@/services/resume';
import { browserName, collectTechInfo, osName } from '@/services/support/techInfo';
import { setBackendForTesting } from '@/services/account/backend';
import { FakeServer } from './fakeBackend';

const renderAt = (path: string) => {
  cleanup();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};
const play = (id: string) => `/app/experience/${id}/play`;

/** 처음 안내를 이미 본 사용자 (다른 테스트가 HOME을 깔끔하게 보게) */
const seenOnboarding = () => localStorage.setItem(STORAGE_KEYS.onboarding, JSON.stringify({ seenAt: '2026-10-01T00:00:00.000Z' }));

afterEach(() => setBackendForTesting(undefined));

describe('A. 이어하기 — EXPERIENCE', () => {
  it('중간 상태 저장 → 다시 열면 "이어갈래?" → 이어하기는 그 장면부터', async () => {
    const user = userEvent.setup();
    renderAt(play('exp-city-guide'));
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    await user.click(screen.getByRole('button', { name: '아침 시장' }));
    expect(getStoryResume('exp-city-guide')).toMatchObject({ path: ['meet', 'market'], flags: ['market'], contentVersion: 1 });

    // 앱 재접속 (페이지를 새로 연다)
    renderAt(play('exp-city-guide'));
    expect(screen.getByText('아까 하던 시간을 이어갈래?')).toBeInTheDocument();
    for (const name of ['이어하기', '처음부터', '지금은 안 할래']) expect(screen.getByRole('button', { name })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '이어하기' }));
    expect(screen.getByRole('heading', { level: 2, name: '아침 시장' })).toBeInTheDocument();
  });

  it('처음부터 → 진행 상태를 지우고 첫 장면 · 지금은 안 할래 → 보통 시작 화면 (진행은 남김)', async () => {
    const user = userEvent.setup();
    saveStoryResume({ experienceId: 'exp-city-guide', contentVersion: 1, path: ['meet', 'park'], flags: ['park'] });
    renderAt(play('exp-city-guide'));
    await user.click(screen.getByRole('button', { name: '지금은 안 할래' }));
    expect(screen.getByRole('button', { name: '시작하기' })).toBeInTheDocument();
    expect(getStoryResume('exp-city-guide')).toBeDefined();
    renderAt(play('exp-city-guide'));
    await user.click(screen.getByRole('button', { name: '처음부터' }));
    expect(screen.getByRole('heading', { level: 2, name: '역 앞에서' })).toBeInTheDocument();
  });

  it('HOME 카드 "아까 하던 시간 · 제목 · 약 N분 남았어" → 이어하기', async () => {
    seenOnboarding();
    const user = userEvent.setup();
    saveStoryResume({ experienceId: 'exp-observatory', contentVersion: 1, path: ['dome', 'moon', 'visitor'], flags: ['moon', 'shared-moon'] });
    const router = renderAt('/app');
    const card = screen.getByRole('region', { name: '한밤의 천문대' });
    expect(within(card).getByText('아까 하던 시간')).toBeInTheDocument();
    expect(within(card).getByText(/^약 \d+분 남았어$/)).toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: '이어하기' }));
    expect(router.state.location.pathname).toBe('/app/experience/exp-observatory/play');
    expect(screen.getByRole('heading', { level: 2, name: '방문객' })).toBeInTheDocument();
  });

  it('완료하면 진행 상태만 지워진다 (MY 기록은 남는다)', async () => {
    const user = userEvent.setup();
    const story = getStory('exp-dawn-store')!;
    renderAt(play('exp-dawn-store'));
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    await user.click(screen.getByRole('button', { name: story.scenes[0].choices![0].label }));
    expect(getStoryResume('exp-dawn-store')).toBeDefined();
    await user.click(screen.getByRole('button', { name: '계산대로 돌아간다' }));
    await user.click(screen.getByRole('button', { name: /짧게 말을 건넨다/ }));
    expect(screen.getByText('오늘의 이야기')).toBeInTheDocument();
    expect(getStoryResume('exp-dawn-store')).toBeUndefined();
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    expect(getRecords()[0].experienceId).toBe('exp-dawn-store');
  });

  it('없는 장면·버전 불일치 → 앱은 멈추지 않고 "업데이트돼서 처음부터" 안내', async () => {
    const user = userEvent.setup();
    saveStoryResume({ experienceId: 'exp-bookstore', contentVersion: 1, path: ['open', 'removed-scene'], flags: [] });
    renderAt(play('exp-bookstore'));
    expect(screen.getByText('이 콘텐츠가 업데이트돼서 처음부터 다시 시작해야 해.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    expect(getStoryResume('exp-bookstore')?.path).toEqual([getStory('exp-bookstore')!.start]);

    const story = getStory('exp-photographer')!;
    saveStoryResume({ experienceId: 'exp-photographer', contentVersion: 1, path: [story.start, 'market'], flags: ['market'] });
    story.version = 2; // 콘텐츠가 바뀐 상황
    try {
      renderAt(play('exp-photographer'));
      expect(screen.queryByText('아까 하던 시간을 이어갈래?')).not.toBeInTheDocument();
      expect(screen.getByText('이 콘텐츠가 업데이트돼서 처음부터 다시 시작해야 해.')).toBeInTheDocument();
    } finally {
      delete story.version;
    }
    expect(getRecords()).toEqual([]); // 다른 데이터는 그대로
  });
});

describe('A. 이어하기 — 작은 코스', () => {
  it('첫 시간 완료 → 나가기 → HOME 카드 "아까 하던 작은 OFFROU 코스" → 이어하기 → 둘째 시간', async () => {
    seenOnboarding();
    const user = userEvent.setup();
    renderAt('/app/course?cmin=20&cvibe=any&csteps=rest-just-here,hobby-color-combo,play-small-choice');
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    expect(getCourseResume()).toMatchObject({ step: 0, stepIds: ['rest-just-here', 'hobby-color-combo', 'play-small-choice'] });
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    expect(getCourseResume()).toMatchObject({ step: 1 });

    const router = renderAt('/app');
    expect(screen.getByText('아까 하던 작은 OFFROU 코스가 있어.')).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 3 · 다음: 색 조합 만들기/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '이어하기' }));
    expect(router.state.location.pathname).toBe('/app/experience/hobby-color-combo/play');
  });

  it('그만둘래 → 카드만 사라진다 · 코스를 끝까지 하면 진행 상태 제거', async () => {
    seenOnboarding();
    const user = userEvent.setup();
    renderAt('/app/course?cmin=20&cvibe=calm&csteps=rest-window,rest-ten-breaths');
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    renderAt('/app');
    await user.click(screen.getByRole('button', { name: '그만둘래' }));
    expect(getCourseResume()).toBeUndefined();
    expect(screen.queryByText('아까 하던 작은 OFFROU 코스가 있어.')).not.toBeInTheDocument();

    renderAt('/app/course?cmin=20&cvibe=calm&csteps=rest-window,rest-ten-breaths');
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    await user.click(screen.getByRole('button', { name: '다음 시간으로' }));
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    expect(screen.getByRole('heading', { name: '오늘은 평소와 조금 다른 시간을 보냈어.' })).toBeInTheDocument();
    expect(getCourseResume()).toBeUndefined();
    expect(getRecords()).toHaveLength(2);
  });
});

describe('B. 최근 본 시간', () => {
  it('상세·실행 화면을 연 것만 남는다 (HOME 추천 카드 노출은 남지 않는다)', async () => {
    seenOnboarding();
    renderAt('/app');
    renderAt('/app/now');
    expect(getRecentRaw()).toEqual([]);
    renderAt('/app/experience/hobby-one-card');
    renderAt(play('rest-just-here'));
    expect(getRecentRaw().map((e) => e.id)).toEqual(['rest-just-here', 'hobby-one-card']);
  });

  it('중복은 시각만 갱신 · 최근 순 · 최대 20개', () => {
    noteRecent('a', new Date('2026-10-01'));
    noteRecent('b', new Date('2026-10-02'));
    noteRecent('a', new Date('2026-10-03'));
    expect(getRecentRaw().map((e) => e.id)).toEqual(['a', 'b']);
    for (let i = 0; i < 30; i++) noteRecent(`x${i}`);
    expect(getRecentRaw()).toHaveLength(RECENT_LIMIT);
    expect(getRecentRaw()[0].id).toBe('x29');
  });

  it('MY "최근 본 시간" 탭: 제목·카테고리·시간 → 다시 열기 · 사라진 콘텐츠는 조용히 빠진다', async () => {
    const user = userEvent.setup();
    noteRecent('retired-content', new Date('2026-10-01'));
    noteRecent('exp-observatory', new Date('2026-10-02'));
    noteRecent('out-bench', new Date('2026-10-03'));
    const router = renderAt('/app/my?tab=recent');
    const panel = screen.getByRole('tabpanel');
    const links = within(panel).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(['벤치 하나 찾아 앉기OUT · 약 10분', '한밤의 천문대EXPERIENCE · 약 10분']);
    await user.click(links[1]);
    expect(router.state.location.pathname).toBe('/app/experience/exp-observatory');
    expect(getRecentRaw().some((e) => e.id === 'retired-content')).toBe(true); // 저장값은 지우지 않음
  });
});

describe('C. 콘텐츠 문제 알려주기 · 문의', () => {
  let server: FakeServer;
  beforeEach(() => {
    server = new FakeServer();
    setBackendForTesting(server.createDevice());
  });

  it('상세·실행 화면의 작은 "문제 알려주기" → 유형 5개 → (설명 선택) → 보내기 → 고마워 + 접수번호', async () => {
    const user = userEvent.setup();
    renderAt(play('hobby-one-card'));
    await user.click(screen.getByRole('button', { name: '문제 알려주기' }));
    const dialog = screen.getByRole('dialog', { name: '어떤 문제가 있었어?' });
    const reasons = within(dialog).getAllByRole('radio').map((b) => b.textContent);
    expect(reasons).toEqual(['실행이 안 돼요', '내용이 이상해요', '예상 시간이 맞지 않아요', '화면이 이상해요', '기타']);
    expect(within(dialog).getByRole('button', { name: '보내기' })).toBeDisabled();
    await user.click(within(dialog).getByRole('radio', { name: '예상 시간이 맞지 않아요' }));
    await user.click(within(dialog).getByRole('button', { name: '보내기' }));
    expect(await screen.findByText('알려줘서 고마워. 확인해볼게.')).toBeInTheDocument();
    expect(screen.getByText(/^OFF-\d{8}-\w+$/)).toBeInTheDocument();
    const row = server.supportRequests[0];
    expect(row).toMatchObject({
      type: 'content',
      title: '[콘텐츠] 한 장 디자인 · 예상 시간이 맞지 않아요',
      message: '예상 시간이 맞지 않아요',
      content_id: 'hobby-one-card',
      content_version: 1,
      category: 'hobby',
      report_reason: 'time-off',
      route: '/',
      is_guest: true,
      status: 'new',
      priority: 'normal',
    });
    expect(row.app_version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('문의 화면: 10가지 유형 · 제목/내용 검사 · 함께 보내는 정보 공개 · 접수번호 · 이 기기의 내 문의', async () => {
    const user = userEvent.setup();
    renderAt('/app/support');
    expect(screen.getAllByRole('radio')).toHaveLength(10);
    await user.click(screen.getByRole('button', { name: '접수하기' }));
    expect(screen.getByText('제목을 적어줘.')).toBeInTheDocument();
    expect(screen.getByText('내용을 적어줘.')).toBeInTheDocument();
    expect(server.supportRequests).toHaveLength(0);
    await user.click(screen.getByRole('radio', { name: '개선 제안' }));
    await user.type(screen.getByLabelText('제목'), '다크모드 좋아요');
    await user.type(screen.getByLabelText('내용'), '밤에 쓰기 편해요');
    await user.type(screen.getByLabelText(/답변 받을 이메일/), 'not-an-email');
    expect(screen.getByText('이메일 형식을 확인해줘.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/답변 받을 이메일/));
    expect(within(screen.getByRole('list', { name: '함께 보내는 정보' })).getByText(/앱 버전/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '접수하기' }));
    expect(await screen.findByText('접수가 완료됐어.')).toBeInTheDocument();
    const number = server.supportRequests[0].request_number;
    expect(screen.getByText(number)).toBeInTheDocument();
    renderAt('/app/support/mine');
    expect(screen.getByText(number)).toBeInTheDocument();
  });

  it('연속 클릭해도 한 건만 · 실패하면 쓴 내용 유지 + 다시 시도', async () => {
    const user = userEvent.setup();
    renderAt('/app/support?type=bug');
    await user.type(screen.getByLabelText('제목'), '버튼이 안 눌려요');
    await user.type(screen.getByLabelText('내용'), 'HOME에서');
    server.online = false;
    await user.click(screen.getByRole('button', { name: '접수하기' }));
    // 연결이 끊겨 실패 → 연결 안내 (쓴 내용은 그대로)
    expect(await screen.findByRole('alert')).toHaveTextContent('인터넷에 연결된 뒤 다시 시도해줘');
    expect(screen.getByLabelText('제목')).toHaveValue('버튼이 안 눌려요');
    server.online = true;
    const button = screen.getByRole('button', { name: '접수하기' });
    await user.tripleClick(button);
    await screen.findByText('접수가 완료됐어.');
    expect(server.supportRequests).toHaveLength(1);
  });

  it('오프라인이면 "인터넷에 연결된 뒤" · 서버가 없으면 정직하게 안내 (콘텐츠 이용은 그대로)', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    try {
      renderAt('/app/support');
      await user.type(screen.getByLabelText('제목'), 'a');
      await user.type(screen.getByLabelText('내용'), 'b');
      await user.click(screen.getByRole('button', { name: '접수하기' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('인터넷에 연결된 뒤 다시 시도해줘.');
    } finally {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    }
    setBackendForTesting(null);
    renderAt('/app/support');
    await user.type(screen.getByLabelText('제목'), 'a');
    await user.type(screen.getByLabelText('내용'), 'b');
    await user.click(screen.getByRole('button', { name: '접수하기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('서버 연결 준비 중');
    renderAt(play('rest-just-here'));
    expect(screen.getByRole('button', { name: '여기 있을래' })).toBeInTheDocument();
  });

  it('서버 빈도 제한 (10분 5건) → 안내', async () => {
    const device = server.createDevice();
    for (let i = 0; i < 5; i++) await device.support!.submit({ type: 'other', title: 't', message: 'm', info: collectTechInfo() });
    await expect(device.support!.submit({ type: 'other', title: 't', message: 'm', info: collectTechInfo() })).rejects.toMatchObject({ code: 'rate_limited' });
  });

  it('민감정보를 보내지 않는다 (토큰·비밀번호·위치·작성한 글·쿼리)', async () => {
    localStorage.setItem('fake-auth-session', JSON.stringify({ id: 'u', email: 'me@x.com', access_token: 'SECRET' }));
    const info = collectTechInfo({ content_id: 'hobby-one-paragraph' });
    expect(Object.keys(info).sort()).toEqual(['app_version', 'browser', 'content_id', 'is_pwa', 'os', 'route', 'screen']);
    expect(JSON.stringify(info)).not.toMatch(/SECRET|token|password|lat|lng|@/);
    expect(browserName('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/122 Mobile Safari/537.36')).toBe('Chrome');
    expect(osName('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)')).toBe('iOS');
  });

  it('로그인 사용자: 접수 → 내 문의에서 상태·답변 확인', async () => {
    const user = userEvent.setup();
    const device = server.createDevice();
    await device.signUp('me@offrou.app', 'long-enough-1');
    setBackendForTesting(device);
    renderAt('/app/my');
    await screen.findByText('OFFROU가 이어지고 있어.');
    renderAt('/app/support');
    await user.click(screen.getByRole('radio', { name: '기록이나 저장 데이터 문제' }));
    await user.type(screen.getByLabelText('제목'), '기록이 안 보여요');
    await user.type(screen.getByLabelText('내용'), '어제 한 게 없어요');
    await user.click(screen.getByRole('button', { name: '접수하기' }));
    await screen.findByText('접수가 완료됐어.');
    const row = server.supportRequests[0];
    expect(row).toMatchObject({ user_id: server.userId('me@offrou.app'), is_guest: false, type: 'data' });
    // 운영자가 처리하고 답변
    row.status = 'resolved';
    row.reply = '확인해서 고쳤어요.';
    renderAt('/app/support/mine');
    expect(await screen.findByText('처리 완료')).toBeInTheDocument();
    expect(screen.getByText('확인해서 고쳤어요.')).toBeInTheDocument();
  });

  it('RLS: 사용자 A는 자기 문의만, B 문의는 못 본다 · 비회원은 목록 조회 불가 · 일반 사용자는 수정·메모 불가', async () => {
    const a = server.createDevice();
    await a.signUp('a@offrou.app', 'long-enough-1');
    await a.support!.submit({ type: 'bug', title: 'A의 문의', message: 'm', info: collectTechInfo() });
    await a.signOut();
    const b = server.createDevice();
    await b.signUp('b@offrou.app', 'long-enough-1');
    server.clientKey = 'device-2';
    await b.support!.submit({ type: 'bug', title: 'B의 문의', message: 'm', info: collectTechInfo() });
    expect((await b.support!.listMine()).map((r) => r.title)).toEqual(['B의 문의']);
    expect((await b.admin!.list()).map((r) => r.title)).toEqual(['B의 문의']); // 운영자가 아니면 자기 것만
    await expect(b.admin!.update(server.supportRequests[0].id, { status: 'closed' })).rejects.toBeTruthy();
    await expect(b.admin!.addNote(server.supportRequests[1].id, 'x')).rejects.toBeTruthy();
    expect(await b.admin!.isAdmin()).toBe(false);
    await b.signOut();
    await expect(b.support!.listMine()).rejects.toMatchObject({ code: 'session_expired' });
    await expect(b.admin!.list()).rejects.toMatchObject({ code: 'session_expired' });
  });
});

describe('운영자 관리센터 /admin', () => {
  let server: FakeServer;
  const seed = async () => {
    const guest = server.createDevice();
    await guest.support!.submit({ type: 'content', title: '이야기가 멈춰요', message: '천문대 3장면', info: { ...collectTechInfo(), content_id: 'exp-observatory', content_version: 1 } });
    server.clientKey = 'device-2';
    await guest.support!.submit({ type: 'suggestion', title: '다크모드 좋아요', message: '굿', info: collectTechInfo() });
  };
  beforeEach(() => {
    server = new FakeServer();
    setBackendForTesting(server.createDevice());
  });

  it('비로그인 → 운영자 로그인 화면 (데이터 없음) · 일반 사용자 → 권한 없음', async () => {
    await seed();
    const user = userEvent.setup();
    renderAt('/admin');
    expect(await screen.findByRole('heading', { name: '운영자 로그인' })).toBeInTheDocument();
    expect(screen.queryByText('이야기가 멈춰요')).not.toBeInTheDocument();
    const someone = server.createDevice();
    await someone.signUp('user@offrou.app', 'long-enough-1');
    await someone.signOut();
    await user.type(screen.getByLabelText('이메일'), 'user@offrou.app');
    await user.type(screen.getByLabelText('비밀번호'), 'long-enough-1');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('이 계정에는 운영자 권한이 없어.')).toBeInTheDocument();
    expect(screen.queryByText('이야기가 멈춰요')).not.toBeInTheDocument();
  });

  it('운영자: 현황 · 목록 · 검색/필터 · 상세(기술 정보) · 상태·우선순위 · 답변 · 내부 메모 · 처리 이력 · 로그아웃', async () => {
    await seed();
    const adminDevice = server.createDevice();
    await adminDevice.signUp('ops@offrou.app', 'long-enough-1');
    server.admins.add(server.userId('ops@offrou.app')!);
    const user = userEvent.setup();
    renderAt('/admin');
    expect(await screen.findByText('운영자', { selector: 'strong' })).toBeInTheDocument();
    await screen.findByRole('list', { name: '요청 목록' });
    const counts = screen.getByRole('region', { name: '요청 현황' });
    expect(counts).toHaveTextContent('2전체2신규0확인 중0처리 중0처리 완료');

    await user.type(screen.getByRole('searchbox', { name: '접수번호 또는 제목 검색' }), '다크');
    await waitFor(() => expect(within(screen.getByRole('list', { name: '요청 목록' })).getAllByRole('button')).toHaveLength(1));
    await user.clear(screen.getByRole('searchbox', { name: '접수번호 또는 제목 검색' }));
    await user.selectOptions(screen.getByRole('combobox', { name: '유형' }), 'content');
    await waitFor(() => expect(within(screen.getByRole('list', { name: '요청 목록' })).getAllByRole('button')).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: /이야기가 멈춰요/ }));
    expect(await screen.findByRole('heading', { name: '이야기가 멈춰요' })).toBeInTheDocument();
    expect(screen.getByText('exp-observatory (v1, -)')).toBeInTheDocument();
    expect(screen.getByText('비회원')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: '상태' }), 'checking');
    await screen.findByText('상태를 바꿨어.');
    await user.selectOptions(screen.getByRole('combobox', { name: '우선순위' }), 'high');
    await user.type(screen.getByLabelText('메모 추가'), '재현 완료');
    await user.click(screen.getByRole('button', { name: '메모 저장' }));
    expect(await screen.findByText(/재현 완료/)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: '상태' }), 'in_progress');
    await user.selectOptions(screen.getByRole('combobox', { name: '상태' }), 'resolved');
    await user.type(screen.getByLabelText(/사용자에게 보이는 답변/), '다음 배포에서 고쳤어요.');
    await user.click(screen.getByRole('button', { name: '답변 저장' }));
    await screen.findByText('답변을 저장했어.');

    const row = server.supportRequests[0];
    expect(row).toMatchObject({ status: 'resolved', priority: 'high', reply: '다음 배포에서 고쳤어요.' });
    expect(server.supportHistory.map((h) => h.new_status)).toEqual(['checking', 'in_progress', 'resolved']);
    expect(server.supportNotes.map((n) => n.note)).toEqual(['재현 완료']);
    const hist = screen.getByRole('region', { name: '처리 이력' });
    expect(within(hist).getAllByRole('listitem').map((li) => li.textContent?.replace(/^\S+ \S+ /, ''))).toEqual(['접수', '확인 중', '처리 중', '처리 완료']);

    await user.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('heading', { name: '운영자 로그인' })).toBeInTheDocument();
    expect(screen.queryByText('이야기가 멈춰요')).not.toBeInTheDocument();
  });

  it('세션이 끝나면(권한 사라짐) 데이터를 지우고 다시 로그인', async () => {
    await seed();
    const adminDevice = server.createDevice();
    await adminDevice.signUp('ops@offrou.app', 'long-enough-1');
    server.admins.add(server.userId('ops@offrou.app')!);
    const user = userEvent.setup();
    renderAt('/admin');
    await screen.findByRole('list', { name: '요청 목록' });
    server.admins.clear();
    await user.click(screen.getByRole('button', { name: '새로고침' }));
    expect(await screen.findByRole('heading', { name: '운영자 로그인' })).toBeInTheDocument();
    expect(screen.queryByText('이야기가 멈춰요')).not.toBeInTheDocument();
  });

  it('일반 화면 어디에도 관리센터 링크가 없고, PWA 시작 주소는 /app 그대로', () => {
    seenOnboarding();
    for (const path of ['/app', '/app/my', '/app/support', '/app/discover']) {
      renderAt(path);
      expect(document.querySelector('a[href^="/admin"]'), path).toBeNull();
      expect(document.body.textContent).not.toMatch(/관리센터|운영자 로그인|\/admin/);
    }
    expect(JSON.parse(readFileSync(join(process.cwd(), 'public/manifest.webmanifest'), 'utf8')).start_url).toBe('/app');
  });

  it('서버 정책: 운영자 판단은 서버 함수, 비회원은 접수 함수만, 일반 사용자는 수정 불가', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261008000000_offrou_support.sql'), 'utf8');
    expect(sql).toMatch(/create or replace function public\.is_offrou_admin\(\)[\s\S]*security definer/);
    expect(sql).toMatch(/revoke all on public\.offrou_admins from anon, authenticated/);
    expect(sql).toMatch(/for update to authenticated\s+using \(\(select public\.is_offrou_admin\(\)\)\)/);
    expect(sql).toMatch(/using \(user_id = \(select auth\.uid\(\)\) or \(select public\.is_offrou_admin\(\)\)\)/);
    expect(sql).toMatch(/revoke all on public\.offrou_support_requests, public\.offrou_support_notes, public\.offrou_support_history from anon/);
    expect(sql).toMatch(/grant execute on function public\.submit_support_request\(text, text, text, text, jsonb\) to anon, authenticated/);
    expect(sql).toMatch(/raise exception 'rate_limited'/);
    // 운영자를 자동으로 지정하는 문장이 없다 (주석 안내만)
    expect(sql).not.toMatch(/^\s*insert into public\.offrou_admins/m);
    // 프런트에 운영자 판단 하드코딩 없음
    const app = readFileSync(join(process.cwd(), 'src/features/admin/AdminApp.tsx'), 'utf8');
    expect(app).not.toMatch(/localStorage|@offrou|===\s*'[^']+@/);
  });
});

describe('D. 콘텐츠 버전 · E. 처음 사용 안내 · 데이터', () => {
  it('새 완료 기록에 contentVersion · 버전이 없는 옛 기록도 정상 표시 · 저장은 id 그대로', () => {
    const rec = addRecord(getExperience('exp-bookstore')!);
    expect(rec.contentVersion).toBe(1);
    const story = getStory('exp-bookstore')!;
    story.version = 3;
    try {
      expect(getContentVersion(getExperience('exp-bookstore')!)).toBe(3);
      expect(getExperience('exp-bookstore')!.id).toBe('exp-bookstore'); // id는 바뀌지 않는다
      toggleSaved('exp-bookstore');
      expect(getSaved().map((s) => s.experienceId)).toEqual(['exp-bookstore']);
    } finally {
      delete story.version;
    }
    localStorage.setItem(
      STORAGE_KEYS.records,
      JSON.stringify([{ id: 'old', experienceId: 'rest-window', title: '창밖 바라보기', categoryId: 'rest', minutes: 5, completedAt: '2026-09-01T00:00:00.000Z' }]),
    );
    seenOnboarding();
    renderAt('/app/my');
    expect(screen.getByText('창밖 바라보기')).toBeInTheDocument();
  });

  it('처음 /app: 짧은 안내 하나 → 바로 시작하기 → 다시 오면 안 보인다', async () => {
    const user = userEvent.setup();
    renderAt('/app');
    const guide = screen.getByRole('region', { name: '처음 사용 안내' });
    expect(guide).toHaveTextContent('지금 필요한 시간을 골라봐.OFFROU가 오늘의 다른 시간을 하나 골라줄게.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); // 여러 장 온보딩·가입 요구 없음
    await user.click(within(guide).getByRole('button', { name: '바로 시작하기' }));
    expect(screen.queryByRole('region', { name: '처음 사용 안내' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.onboarding)!)).toMatchObject({ by: 'start' });
    renderAt('/app');
    expect(screen.queryByRole('region', { name: '처음 사용 안내' })).not.toBeInTheDocument();
  });

  it('닫기(✕)로도 다시 안 보인다', async () => {
    const user = userEvent.setup();
    renderAt('/app');
    await user.click(screen.getByRole('button', { name: '안내 닫기' }));
    renderAt('/app');
    expect(screen.queryByRole('region', { name: '처음 사용 안내' })).not.toBeInTheDocument();
  });

  it('업데이트(저장 구조 v2) 후 기존 사용자에게는 안내를 다시 보여주지 않는다 · 기존 데이터 그대로 · 새 키만', () => {
    const records = JSON.stringify([{ id: 'r', experienceId: 'out-sky', title: '문 밖에서 하늘 보기', categoryId: 'out', minutes: 5, completedAt: '2026-09-01T00:00:00.000Z' }]);
    const activity = JSON.stringify({ recentShown: [], skipped: {}, started: {}, recentViewed: ['exp-bookstore', 'out-sky'] });
    localStorage.setItem(STORAGE_KEYS.records, records);
    localStorage.setItem(STORAGE_KEYS.activity, activity);
    const result = runStorageMigrations();
    expect(result).toMatchObject({ ok: true, to: CURRENT_STORAGE_VERSION });
    expect(CURRENT_STORAGE_VERSION).toBe(2);
    expect(result.changedKeys.sort()).toEqual([STORAGE_KEYS.onboarding, STORAGE_KEYS.recentViewed].sort());
    expect(localStorage.getItem(STORAGE_KEYS.records)).toBe(records);
    expect(localStorage.getItem(STORAGE_KEYS.activity)).toBe(activity);
    expect(getRecentRaw().map((e) => e.id)).toEqual(['exp-bookstore', 'out-sky']);
    renderAt('/app');
    expect(screen.queryByRole('region', { name: '처음 사용 안내' })).not.toBeInTheDocument();
  });

  it('PWA 재실행(앱을 새로 열기) 후에도 이어하기·최근 본·안내 상태 유지', () => {
    saveStoryResume({ experienceId: 'exp-observatory', contentVersion: 1, path: ['dome', 'moon'], flags: ['moon'] });
    noteRecent('out-bench');
    seenOnboarding();
    const snapshot = { ...localStorage };
    cleanup();
    localStorage.clear();
    for (const [k, v] of Object.entries(snapshot)) localStorage.setItem(k, v as string);
    runStorageMigrations();
    renderAt('/app');
    expect(screen.getByRole('region', { name: '한밤의 천문대' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '처음 사용 안내' })).not.toBeInTheDocument();
    expect(getRecentRaw()[0].id).toBe('out-bench');
  });

  it('최근 본·이어하기는 오프라인에서도', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    try {
      const user = userEvent.setup();
      renderAt('/app/experience/exp-plant-shop');
      await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
      await user.click(screen.getByRole('button', { name: '시작하기' }));
      await user.click(screen.getByRole('button', { name: /창가로 화분을/ }));
      expect(getStoryResume('exp-plant-shop')).toBeDefined();
      expect(getRecentRaw()[0].id).toBe('exp-plant-shop');
    } finally {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    }
  });

  it('회귀: HOME 6개 카드 · / · /app', async () => {
    seenOnboarding();
    renderAt('/app');
    expect(within(screen.getByRole('group', { name: '지금 어떤 시간이 필요해?' })).getAllByRole('button')).toHaveLength(6);
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: '같은 하루에, 다른 시간을.' }, { timeout: 8000 })).toBeInTheDocument();
    await act(async () => {});
  });
});
