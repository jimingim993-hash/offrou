import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '@/app/router';
import { setBackendForTesting } from '@/services/account/backend';
import { getLink, getBackup } from '@/services/account/link';
import { getExperience } from '@/services/experiences';
import { addRecord, getRecords } from '@/services/records';
import { getSaved, toggleSaved } from '@/services/saved';
import { getFeedback, setFeedback } from '@/services/feedback';
import { FakeServer } from './fakeBackend';

let server: FakeServer;
type User = ReturnType<typeof userEvent.setup>;

/** 한 번에 한 화면만 띄운다 (이전 화면은 내린다) */
const renderAt = (path: string) => {
  cleanup();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};

/** 새 기기: 화면을 내리고 이 기기 저장소를 비운 뒤, 같은 서버를 쓰는 새 백엔드를 끼운다 */
const newDevice = () => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  const device = server.createDevice();
  setBackendForTesting(device);
  return device;
};

/** 기기 전환을 위해 이 기기 저장소를 통째로 보관/복원 */
const saveDevice = () => ({ ...localStorage });
const restoreDevice = (data: Record<string, string>) => {
  cleanup();
  localStorage.clear();
  for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  setBackendForTesting(server.createDevice());
};

async function fillAuth(user: User, email: string, password: string, submit: string) {
  await user.type(await screen.findByLabelText('이메일'), email);
  await user.type(screen.getByLabelText('비밀번호'), password);
  await user.click(screen.getByRole('button', { name: submit }));
}

async function signUp(user: User, email = 'me@offrou.app', password = 'long-enough-1') {
  const router = renderAt('/app/account?mode=signup');
  await fillAuth(user, email, password, 'OFFROU 시작하기');
  return router;
}

async function logIn(user: User, email = 'me@offrou.app', password = 'long-enough-1') {
  const router = renderAt('/app/account?mode=login');
  await fillAuth(user, email, password, '로그인');
  return router;
}

const syncNow = async (user: User) => {
  const router = renderAt('/app/account');
  await user.click(await screen.findByRole('button', { name: '지금 동기화' }));
  await screen.findByText(/^동기화됨/);
  return router;
};

beforeEach(() => {
  server = new FakeServer();
  setBackendForTesting(server.createDevice());
});

afterEach(() => setBackendForTesting(undefined));

describe('비회원 모드 (계정 기능이 켜져 있어도)', () => {
  it('HOME에 로그인 요구 없이, 추천 → 경험 → MY 기록·저장이 그대로 된다', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/계정 만들기|로그인/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /쉬고 싶어/ }));
    await user.click(screen.getByRole('button', { name: '10분' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(await screen.findByRole('button', { name: '저장' }));
    await user.click(screen.getByRole('button', { name: '이 시간 시작하기' }));
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    await user.click(screen.getByRole('button', { name: 'MY OFFROU 보기' }));

    expect(router.state.location.pathname).toBe('/app/my');
    expect(await screen.findByText('이 기기에만 기록되고 있어.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '계정 만들기' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument();
    expect(getRecords()).toHaveLength(1);
    expect(getSaved()).toHaveLength(1);
    expect(server.users.size).toBe(0); // 아무것도 서버로 가지 않았다
  });

  it('EXPERIENCE도 비회원으로 끝까지', async () => {
    const user = userEvent.setup();
    renderAt('/app/experience/exp-detective/play');
    await user.click(screen.getByRole('button', { name: '시작하기' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(screen.getByRole('button', { name: '영수증' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(screen.getByRole('button', { name: '대학생의 가방이다' }));
    await user.click(screen.getByRole('button', { name: '이 시간 마치기' }));
    expect(getRecords()[0]).toMatchObject({ experienceId: 'exp-detective', endingTitle: '바닐라 라떼의 단서' });
  });
});

describe('회원가입·로그인', () => {
  it('입력값을 검사하고, 오류를 입력칸과 연결해 알려준다', async () => {
    const user = userEvent.setup();
    renderAt('/app/account?mode=signup');
    expect(await screen.findByRole('heading', { name: '다른 기기에서도 이 시간을 이어갈까?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'OFFROU 시작하기' }));
    expect(screen.getByText('이메일을 입력해줘.')).toBeInTheDocument();
    expect(screen.getByLabelText('이메일')).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByLabelText('이메일'), 'not-email');
    await user.type(screen.getByLabelText('비밀번호'), 'short');
    await user.click(screen.getByRole('button', { name: 'OFFROU 시작하기' }));
    expect(screen.getByText('이메일 형식을 다시 확인해줘.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호는 8자 이상으로 만들어줘.')).toBeInTheDocument();
    expect(server.users.size).toBe(0);
  });

  it('이메일·비밀번호만으로 가입하면 원래 화면(MY)으로 돌아오고 계정과 이어진다', async () => {
    const user = userEvent.setup();
    const router = await signUp(user);
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/my'));
    expect(await screen.findByText('OFFROU가 이어지고 있어.')).toBeInTheDocument();
    expect(getLink()?.email).toBe('me@offrou.app');
    expect([...server.users.values()][0]).toEqual(expect.objectContaining({ email: 'me@offrou.app' }));
  });

  it('이메일 인증이 켜져 있으면 메일 확인을 안내한다', async () => {
    const user = userEvent.setup();
    server.requireEmailConfirm = true;
    await signUp(user);
    expect(await screen.findByText('메일함을 확인해줘.')).toBeInTheDocument();
  });

  it('이미 있는 이메일, 틀린 비밀번호는 사람 말로', async () => {
    const user = userEvent.setup();
    await signUp(user);
    newDevice();
    await signUp(user);
    expect(await screen.findByText('이미 쓰고 있는 이메일이야. 로그인해볼래?')).toBeInTheDocument();

    newDevice();
    await logIn(user, 'me@offrou.app', 'wrong-password');
    expect(await screen.findByText('이메일이나 비밀번호를 다시 확인해줘.')).toBeInTheDocument();
    expect(screen.queryByText(/AuthApiError|Invalid login/)).not.toBeInTheDocument();
  });

  it('로그인 상태는 새로고침(다시 열기) 후에도 유지된다', async () => {
    const user = userEvent.setup();
    await signUp(user);
    await screen.findByText('OFFROU가 이어지고 있어.');
    cleanup(); // 같은 기기에서 다시 열기
    setBackendForTesting(server.createDevice());
    renderAt('/app/my');
    expect(await screen.findByText('OFFROU가 이어지고 있어.')).toBeInTheDocument();
  });

  it('로그아웃해도 OFFROU는 계속 쓸 수 있다 (기본: 이 기기 기록은 남김)', async () => {
    const user = userEvent.setup();
    await signUp(user);
    await screen.findByText('OFFROU가 이어지고 있어.');
    addRecord(getExperience('rest-window')!);

    const router = renderAt('/app/account');
    await user.click(await screen.findByRole('button', { name: '로그아웃' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '로그아웃' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/app/my'));
    expect(await screen.findByText('로그아웃했어. OFFROU는 그대로 쓸 수 있어.')).toBeInTheDocument();
    expect(screen.getByText('이 기기에만 기록되고 있어.')).toBeInTheDocument();
    expect(getRecords()).toHaveLength(1);
    expect(server.snapshotOf(server.userId('me@offrou.app')!).records).toHaveLength(1); // 나가기 전에 올려둠

    await router.navigate('/app/experience/out-sky/play');
    await user.click(await screen.findByRole('button', { name: '이 시간 마치기' }));
    expect(getRecords()).toHaveLength(2);
  });

  it('로그아웃하면서 이 기기 기록만 지울 수 있다 (계정 기록은 그대로)', async () => {
    const user = userEvent.setup();
    await signUp(user);
    await screen.findByText('OFFROU가 이어지고 있어.');
    addRecord(getExperience('rest-window')!);
    renderAt('/app/account');
    await user.click(await screen.findByRole('button', { name: '로그아웃' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox', { name: /이 기기에 남은 기록도 지우기/ }));
    await user.click(within(dialog).getByRole('button', { name: '로그아웃' }));
    await screen.findByText('이 기기에만 기록되고 있어.');
    expect(getRecords()).toEqual([]);
    expect(server.snapshotOf(server.userId('me@offrou.app')!).records).toHaveLength(1);
  });
});

describe('비회원 → 회원 전환', () => {
  const seedGuest = () => {
    addRecord(getExperience('rest-window')!);
    const r = addRecord(getExperience('exp-radio-dj')!, { endingTitle: '조용한 밤의 방송' });
    setFeedback(r, 'good');
    toggleSaved('out-sky');
  };

  it('이 기기 기록을 감지해 이어갈지 묻고, 이어가면 계정에 합쳐진다', async () => {
    const user = userEvent.setup();
    seedGuest();
    const router = await signUp(user);
    expect(await screen.findByRole('heading', { name: '이 기기의 OFFROU 기록을 계정에 이어갈까?' })).toBeInTheDocument();
    expect(screen.getByText(/지나온 시간/).textContent).toContain('2개');
    expect(screen.getByText(/지나온 시간/).textContent).toContain('1개');

    await user.click(screen.getByRole('button', { name: '이어가기' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/my'));
    expect(await screen.findByText('지금까지의 시간을 이어왔어.')).toBeInTheDocument();

    const remote = server.snapshotOf(server.userId('me@offrou.app')!);
    expect(remote.records).toHaveLength(2);
    expect(remote.saved.map((s) => s.experienceId)).toEqual(['out-sky']);
    expect(remote.feedback).toHaveLength(1);
    expect(getRecords()).toHaveLength(2); // 이 기기 기록도 그대로
  });

  it('여러 번 동기화해도 기록이 복제되지 않는다', async () => {
    const user = userEvent.setup();
    seedGuest();
    await signUp(user);
    await user.click(await screen.findByRole('button', { name: '이어가기' }));
    await screen.findByText('지금까지의 시간을 이어왔어.');
    await syncNow(user);
    await syncNow(user);
    expect(server.snapshotOf(server.userId('me@offrou.app')!).records).toHaveLength(2);
    expect(getRecords()).toHaveLength(2);
  });

  it('새로 시작하면 계정에 올리지 않고, 이 기기 기록은 지우지 않고 따로 보관한다', async () => {
    const user = userEvent.setup();
    seedGuest();
    await signUp(user);
    await user.click(await screen.findByRole('button', { name: '새로 시작하기' }));
    expect(await screen.findByText(/계정에서 새로 시작했어/)).toBeInTheDocument();
    expect(server.snapshotOf(server.userId('me@offrou.app')!).records).toEqual([]);
    expect(getRecords()).toEqual([]);
    expect(getBackup()?.snapshot.records).toHaveLength(2);
  });

  it('1~5단계에서 쌓인 예전 형식 기록도 감지해 이어간다', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      'offrou.records.v1',
      JSON.stringify([{ id: 'old1', experienceId: 'rest-window', title: '창밖 바라보기', categoryId: 'rest', minutes: 5, completedAt: '2026-09-01T10:00:00.000Z' }]),
    );
    localStorage.setItem('offrou.saved.v1', JSON.stringify([{ experienceId: 'hobby-drawing', savedAt: '2026-09-02T00:00:00.000Z' }]));
    localStorage.setItem('offrou.activity.v1', JSON.stringify({ recentShown: ['rest-window'], skipped: {}, started: {} }));
    await signUp(user);
    await user.click(await screen.findByRole('button', { name: '이어가기' }));
    await screen.findByText('지금까지의 시간을 이어왔어.');
    const remote = server.snapshotOf(server.userId('me@offrou.app')!);
    expect(remote.records.map((r) => r.id)).toEqual(['old1']);
    expect(remote.saved.map((s) => s.experienceId)).toEqual(['hobby-drawing']);
  });
});

describe('기기 간 동기화', () => {
  it('휴대폰 A·B, 태블릿 A·C → 두 기기 모두 A·B·C (저장·피드백 포함)', async () => {
    const user = userEvent.setup();
    // 휴대폰: 가입, A·B 완료, 저장, 피드백
    await signUp(user);
    await screen.findByText('OFFROU가 이어지고 있어.');
    const A = addRecord(getExperience('rest-window')!);
    addRecord(getExperience('exp-radio-dj')!);
    setFeedback(A, 'good');
    toggleSaved('out-sky');
    await syncNow(user);
    const phone = saveDevice();

    // 태블릿: 로그인 → 휴대폰 기록이 보인다
    newDevice();
    const router = await logIn(user);
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/my'));
    expect(await screen.findByText('심야 라디오 DJ')).toBeInTheDocument();
    expect(screen.getByText('창밖 바라보기')).toBeInTheDocument();
    await waitFor(() => expect(getSaved().map((s) => s.experienceId)).toEqual(['out-sky']));
    expect(getFeedback()).toHaveLength(1);
    // 태블릿에서 C 완료, 저장 취소
    addRecord(getExperience('out-sky')!);
    toggleSaved('out-sky');
    await syncNow(user);

    // 다시 휴대폰: 동기화하면 A·B·C, 저장 취소도 반영
    restoreDevice(phone);
    await syncNow(user);
    expect(getRecords().map((r) => r.experienceId).sort()).toEqual(['exp-radio-dj', 'out-sky', 'rest-window']);
    expect(getSaved()).toEqual([]);
    expect(server.snapshotOf(server.userId('me@offrou.app')!).records).toHaveLength(3);
  });

  it('로그인 중에는 기록이 생기면 자동으로 이어간다', async () => {
    const user = userEvent.setup();
    await signUp(user);
    await screen.findByText(/^동기화됨/);
    addRecord(getExperience('play-doodle')!);
    await waitFor(() => expect(server.snapshotOf(server.userId('me@offrou.app')!).records).toHaveLength(1), { timeout: 4000 });
  });
});

describe('연결이 불안정할 때', () => {
  it('실패해도 기록은 이 기기에 남고, 다시 연결되면 이어간다', async () => {
    const user = userEvent.setup();
    await signUp(user);
    await screen.findByText(/^동기화됨/);
    server.online = false;

    renderAt('/app/experience/rest-window/play');
    await user.click(await screen.findByRole('button', { name: '이 시간 마치기' }));
    expect(getRecords()).toHaveLength(1);

    renderAt('/app/account');
    await user.click(await screen.findByRole('button', { name: '지금 동기화' }));
    expect(await screen.findByText('기록은 이 기기에 안전하게 남아 있어. 연결되면 다시 이어갈게.')).toBeInTheDocument();
    expect(server.snapshotOf(server.userId('me@offrou.app')!).records).toHaveLength(0);

    server.online = true;
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(server.snapshotOf(server.userId('me@offrou.app')!).records).toHaveLength(1));
    expect(await screen.findByText(/^동기화됨/)).toBeInTheDocument();
  });

  it('로그인 요청이 실패하면 연결 안내 (앱은 그대로)', async () => {
    const user = userEvent.setup();
    await signUp(user);
    newDevice();
    server.online = false;
    await logIn(user);
    expect(await screen.findByText('지금은 연결이 조금 불안정해. 잠시 후 다시 시도해줘.')).toBeInTheDocument();
  });
});

describe('보안: 사용자별 데이터 분리', () => {
  it('사용자 B는 사용자 A의 기록을 받지 못한다', async () => {
    const user = userEvent.setup();
    await signUp(user, 'a@offrou.app');
    await screen.findByText('OFFROU가 이어지고 있어.');
    addRecord(getExperience('rest-window')!);
    await syncNow(user);

    newDevice();
    await signUp(user, 'b@offrou.app');
    await screen.findByText('OFFROU가 이어지고 있어.');
    await screen.findByText(/^동기화됨/);
    expect(getRecords()).toEqual([]);
    expect(server.snapshotOf(server.userId('b@offrou.app')!).records).toEqual([]);
    expect(server.snapshotOf(server.userId('a@offrou.app')!).records).toHaveLength(1);
  });

  it('같은 기기에 다른 계정으로 로그인해도 이전 계정 기록을 섞지 않는다', async () => {
    const user = userEvent.setup();
    await signUp(user, 'a@offrou.app');
    await screen.findByText('OFFROU가 이어지고 있어.');
    addRecord(getExperience('rest-window')!);
    await syncNow(user);
    // 기록은 남기고 로그아웃
    renderAt('/app/account');
    await user.click(await screen.findByRole('button', { name: '로그아웃' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '로그아웃' }));
    await screen.findByText('이 기기에만 기록되고 있어.');

    await signUp(user, 'b@offrou.app');
    await screen.findByText(/^동기화됨/);
    expect(screen.queryByRole('heading', { name: /이어갈까/ })).not.toBeInTheDocument();
    expect(server.snapshotOf(server.userId('b@offrou.app')!).records).toEqual([]);
    expect(getRecords()).toEqual([]);
    expect(getBackup()?.fromUserId).toBe(server.userId('a@offrou.app'));
  });
});

describe('비밀번호', () => {
  it('재설정 메일 요청', async () => {
    const user = userEvent.setup();
    renderAt('/app/account?mode=login');
    await user.click(await screen.findByRole('link', { name: '비밀번호를 잊었어?' }));
    await user.type(screen.getByLabelText('이메일'), 'me@offrou.app');
    await user.click(screen.getByRole('button', { name: '재설정 메일 보내기' }));
    expect(await screen.findByText('메일함을 확인해줘.')).toBeInTheDocument();
    expect(server.resetEmails).toEqual(['me@offrou.app']);
  });

  it('재설정 링크 화면: 세션이 없으면 만료 안내, 있으면 새 비밀번호', async () => {
    const user = userEvent.setup();
    renderAt('/app/account/reset');
    expect(await screen.findByText('링크가 만료됐거나 올바르지 않아.')).toBeInTheDocument();

    await signUp(user);
    await screen.findByText('OFFROU가 이어지고 있어.');
    renderAt('/app/account/reset');
    await user.type(await screen.findByLabelText('새 비밀번호'), 'brand-new-pass');
    await user.click(screen.getByRole('button', { name: '비밀번호 바꾸기' }));
    expect(await screen.findByText('새 비밀번호로 바꿨어.')).toBeInTheDocument();

    newDevice();
    await logIn(user, 'me@offrou.app', 'brand-new-pass');
    expect(await screen.findByText('OFFROU가 이어지고 있어.')).toBeInTheDocument();
  });
});

describe('계정 삭제 vs 이 기기 기록 초기화', () => {
  it('계정 삭제: 확인을 거쳐 서버 계정·기록을 지우고, 이 기기 기록은 남긴다', async () => {
    const user = userEvent.setup();
    await signUp(user);
    await screen.findByText('OFFROU가 이어지고 있어.');
    addRecord(getExperience('rest-window')!);
    await syncNow(user);
    const id = server.userId('me@offrou.app')!;

    await user.click(screen.getByRole('button', { name: 'OFFROU 계정 삭제' }));
    const dialog = screen.getByRole('dialog', { name: 'OFFROU 계정을 삭제할까?' });
    expect(within(dialog).getByText(/저장한 시간·피드백·취향 기록이 모두 지워져/)).toBeInTheDocument();
    const del = within(dialog).getByRole('button', { name: '계정 삭제' });
    expect(del).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox', { name: '위 내용을 확인했어' }));
    await user.click(del);

    expect(await screen.findByText('계정을 삭제했어. 이 기기에 남은 기록은 그대로 있어.')).toBeInTheDocument();
    expect(server.users.size).toBe(0);
    expect(server.tables.has(id)).toBe(false);
    expect(getRecords()).toHaveLength(1);
    expect(getLink()).toBeNull();
  });

  it('로그인 중 "이 기기 기록 초기화"는 서버 기록을 지우지 않는다', async () => {
    const user = userEvent.setup();
    await signUp(user);
    await screen.findByText('OFFROU가 이어지고 있어.');
    addRecord(getExperience('rest-window')!);
    await syncNow(user);

    renderAt('/app/my');
    await user.click(await screen.findByRole('button', { name: '내 OFFROU 기록 초기화' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('계정에 저장된 기록은 지워지지 않아서');
    await user.click(screen.getByRole('button', { name: '모두 지우기' }));

    expect(server.snapshotOf(server.userId('me@offrou.app')!).records).toHaveLength(1);
    expect(getLink()).not.toBeNull();
    // 다시 동기화되면 계정 기록이 돌아온다
    await waitFor(() => expect(getRecords()).toHaveLength(1), { timeout: 4000 });
  });
});

describe('설정이 없거나 세션이 깨졌을 때', () => {
  it('백엔드 설정이 없으면 계정 기능만 꺼지고 앱은 그대로', async () => {
    setBackendForTesting(null);
    const router = renderAt('/app/account');
    expect(screen.getByText('계정 연결 준비가 필요해.')).toBeInTheDocument();
    await router.navigate('/app/my');
    expect(await screen.findByText('이 기기에만 기록되고 있어.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '계정 만들기' })).not.toBeInTheDocument();
    await router.navigate('/app');
    expect(await screen.findByText('지금 어떤 시간이 필요해?')).toBeInTheDocument();
  });

  it('세션 복원이 실패해도 비회원으로 계속', async () => {
    const device = server.createDevice();
    device.getUser = async () => {
      throw new Error('broken session');
    };
    setBackendForTesting(device);
    renderAt('/app/my');
    expect(await screen.findByText('이 기기에만 기록되고 있어.')).toBeInTheDocument();
  });
});
