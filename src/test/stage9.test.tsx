import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '@/app/router';
import { setBackendForTesting } from '@/services/account/backend';
import { STORAGE_KEYS } from '@/services/storage';
import { captureInstallPrompt, isIosSafari, resetInstallForTesting } from '@/pwa/install';
import { formatTime, getNotifySettings, saveNotifySettings, urlBase64ToUint8Array } from '@/pwa/notifications';
import { markUpdateReady, resetUpdatesForTesting, setUpdateApplier } from '@/pwa/updates';
import { watchForUpdates } from '@/pwa/registerServiceWorker';
import { FakeServer } from './fakeBackend';

const renderAt = (path: string) => {
  cleanup();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0 Mobile/15E148 Safari/604.1',
  iphoneKakao:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.5.0',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Mobile Safari/537.36',
};

const originalUA = navigator.userAgent;
const setUA = (ua: string, maxTouchPoints = 5) => {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true });
};

const setStandalone = (on: boolean) => {
  window.matchMedia = ((q: string) => ({
    matches: on && q.includes('standalone'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
};

/* ─── 푸시 흉내 ─── */
interface FakeSub {
  endpoint: string;
  toJSON(): { keys: { p256dh: string; auth: string } };
  unsubscribe: ReturnType<typeof vi.fn>;
}
let currentSub: FakeSub | null = null;
const subscribe = vi.fn(async (_opts: unknown) => {
  currentSub = {
    endpoint: 'https://push.example/sub-1',
    toJSON: () => ({ keys: { p256dh: 'p256-key', auth: 'auth-key' } }),
    unsubscribe: vi.fn(async () => {
      currentSub = null;
      return true;
    }),
  };
  return currentSub;
});
const requestPermission = vi.fn(async () => 'granted');

function installPushSupport(permission: NotificationPermission = 'default') {
  const N = function Notification() {} as unknown as { permission: string; requestPermission: typeof requestPermission };
  N.permission = permission;
  N.requestPermission = requestPermission;
  requestPermission.mockImplementation(async () => {
    N.permission = 'granted';
    return 'granted';
  });
  Object.assign(window, { Notification: N, PushManager: function PushManager() {} });
  const reg = { pushManager: { getSubscription: async () => currentSub, subscribe } };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve(reg), getRegistration: async () => reg },
  });
  return N;
}

function removePushSupport() {
  const w = window as unknown as Record<string, unknown>;
  delete w.Notification;
  delete w.PushManager;
  delete (navigator as unknown as Record<string, unknown>).serviceWorker;
}

let server: FakeServer;

beforeEach(() => {
  server = new FakeServer();
  setBackendForTesting(server.createDevice());
  resetInstallForTesting();
  resetUpdatesForTesting();
  setStandalone(false);
  currentSub = null;
  subscribe.mockClear();
  requestPermission.mockClear();
});

afterEach(() => {
  setBackendForTesting(undefined);
  removePushSupport();
  setUA(originalUA, 0);
  vi.unstubAllEnvs();
});

async function signedIn() {
  const device = server.createDevice();
  await device.signUp('me@offrou.app', 'long-enough-1');
  setBackendForTesting(device);
  return device;
}

const section = () => screen.getByRole('region', { name: '앱과 알림' });

describe('설치 — 강요 없이 MY에서만', () => {
  it('HOME에는 설치 안내·팝업이 없다', () => {
    captureInstallPrompt();
    renderAt('/app');
    expect(screen.queryByText(/홈 화면에 추가/)).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('설치할 수 없는 브라우저에서는 설치 카드를 숨긴다 (가짜 버튼 없음)', () => {
    renderAt('/app/my');
    expect(section()).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '홈 화면에 추가' })).not.toBeInTheDocument();
  });

  it('Android: 브라우저가 설치를 허락하면 버튼이 생기고, 누를 때만 설치 창을 띄운다', async () => {
    const user = userEvent.setup();
    captureInstallPrompt();
    const prompt = vi.fn(async () => undefined);
    renderAt('/app/my');
    const ev = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    act(() => {
      window.dispatchEvent(ev);
    });
    expect(ev.defaultPrevented).toBe(true); // 브라우저 자동 안내 대신
    expect(prompt).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: '홈 화면에 추가하기' }));
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('OFFROU 앱으로 사용 중')).toBeInTheDocument();
  });

  it('설치가 끝나면(appinstalled) 버튼 대신 "앱으로 사용 중"', async () => {
    captureInstallPrompt();
    renderAt('/app/my');
    act(() => {
      window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), { prompt: vi.fn(), userChoice: new Promise(() => {}) }));
    });
    await screen.findByRole('button', { name: '홈 화면에 추가하기' });
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(await screen.findByText('OFFROU 앱으로 사용 중')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '홈 화면에 추가하기' })).not.toBeInTheDocument();
  });

  it('이미 홈 화면 앱(standalone)으로 열려 있으면 "OFFROU 앱으로 사용 중"', () => {
    setStandalone(true);
    renderAt('/app/my');
    expect(screen.getByText('OFFROU 앱으로 사용 중')).toBeInTheDocument();
  });

  it('iPhone Safari: 설치 버튼 없이 "공유 → 홈 화면에 추가" 안내만', () => {
    setUA(UA.iphoneSafari);
    renderAt('/app/my');
    expect(screen.getByText(/Safari의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /홈 화면에 추가/ })).not.toBeInTheDocument();
  });

  it('iPhone의 다른 브라우저·앱 안 브라우저: Safari로 열라고 안내', () => {
    setUA(UA.iphoneChrome);
    renderAt('/app/my');
    expect(screen.getByText(/Safari로 열면 홈 화면에 추가할 수 있어/)).toBeInTheDocument();
  });

  it('iOS Safari 판별', () => {
    expect(isIosSafari({ userAgent: UA.iphoneSafari, maxTouchPoints: 5 })).toBe(true);
    expect(isIosSafari({ userAgent: UA.iphoneChrome, maxTouchPoints: 5 })).toBe(false);
    expect(isIosSafari({ userAgent: UA.iphoneKakao, maxTouchPoints: 5 })).toBe(false);
    expect(isIosSafari({ userAgent: UA.android, maxTouchPoints: 5 })).toBe(false);
    // iPadOS (Mac처럼 보이지만 터치)
    const ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
    expect(isIosSafari({ userAgent: ipad, maxTouchPoints: 5 })).toBe(true);
    expect(isIosSafari({ userAgent: ipad, maxTouchPoints: 0 })).toBe(false);
  });
});

describe('새로운 시간 알림 — 기본 꺼짐, 원할 때만', () => {
  it('첫 방문·HOME·MY 진입만으로는 권한을 묻지 않는다', async () => {
    installPushSupport();
    await signedIn();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U');
    renderAt('/app');
    renderAt('/app/my');
    await screen.findByRole('button', { name: '알림 받기' });
    expect(requestPermission).not.toHaveBeenCalled();
    expect(getNotifySettings().enabled).toBe(false);
  });

  it('지원하지 않는 기기: 그렇다고 말한다', () => {
    renderAt('/app/my');
    expect(screen.getByText('이 기기에서는 아직 알림을 사용할 수 없어.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '알림 받기' })).not.toBeInTheDocument();
  });

  it('iPhone(홈 화면 앱이 아닌 Safari): 홈 화면에 추가해야 받을 수 있다고 안내', () => {
    setUA(UA.iphoneSafari);
    renderAt('/app/my');
    expect(screen.getByText(/홈 화면에 추가한 OFFROU에서 알림을 받을 수 있어/)).toBeInTheDocument();
  });

  it('권한이 거부된 상태: 브라우저 설정 안내', async () => {
    installPushSupport('denied');
    await signedIn();
    renderAt('/app/my');
    expect(screen.getByText('브라우저 설정에서 알림 권한을 변경할 수 있어.')).toBeInTheDocument();
  });

  it('비회원: 로그인한 뒤에 받을 수 있다고 알려준다 (권한 요청 없음)', async () => {
    installPushSupport();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BKey');
    renderAt('/app/my');
    expect(await screen.findByText('알림은 로그인한 뒤에 받을 수 있어.')).toBeInTheDocument();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('공개 키(VAPID)가 없으면 "준비 중" — 거짓 성공 없음', async () => {
    installPushSupport();
    await signedIn();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
    renderAt('/app/my');
    expect(await screen.findByText('알림 기능은 아직 준비 중이야.')).toBeInTheDocument();
  });

  it('켜기: 시간을 고르기 전엔 예약 없음 → "이 시간으로 받기"에서만 권한 요청 → 서버 저장 → 켜짐', async () => {
    const user = userEvent.setup();
    installPushSupport();
    await signedIn();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U');
    renderAt('/app/my');
    expect(screen.getByText('가끔 평소와 다른 시간을 제안해줄게.')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: '알림 받기' }));
    expect(screen.getByText('언제 새로운 시간을 받아볼까?')).toBeInTheDocument();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '이 시간으로 받기' })).toBeDisabled();
    expect(screen.getByText('시간을 고르기 전에는 아무 알림도 예약되지 않아.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '저녁 7:00' }));
    await user.click(screen.getByRole('button', { name: /가끔/ }));
    await user.click(screen.getByRole('button', { name: '이 시간으로 받기' }));

    expect(await screen.findByText('가끔 저녁 7:00쯤 새로운 시간을 제안해줄게.')).toBeInTheDocument();
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    const saved = server.pushSubs.get('https://push.example/sub-1')!;
    expect(saved).toMatchObject({ time: '19:00', frequency: 'sometimes', p256dh: 'p256-key', auth: 'auth-key' });
    expect(saved.timezone).toBeTruthy();
    expect(getNotifySettings()).toMatchObject({ enabled: true, time: '19:00', frequency: 'sometimes' });

    // 끄기: 브라우저 구독·서버 구독 모두 정리
    await user.click(screen.getByRole('button', { name: '알림 끄기' }));
    expect(await screen.findByText('알림을 껐어.')).toBeInTheDocument();
    expect(server.pushSubs.size).toBe(0);
    expect(currentSub).toBeNull();
    expect(getNotifySettings().enabled).toBe(false);
  });

  it('직접 고른 시간도 쓸 수 있다', async () => {
    const user = userEvent.setup();
    installPushSupport();
    await signedIn();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BKey');
    renderAt('/app/my');
    await user.click(await screen.findByRole('button', { name: '알림 받기' }));
    await user.type(screen.getByLabelText('직접 고르기'), '22:15');
    await user.click(screen.getByRole('button', { name: '이 시간으로 받기' }));
    expect(await screen.findByText('매일 밤 10:15쯤 새로운 시간을 제안해줄게.')).toBeInTheDocument();
  });

  it('권한을 거부하면 저장하지 않고 설정 안내', async () => {
    const user = userEvent.setup();
    const N = installPushSupport();
    requestPermission.mockImplementation(async () => {
      N.permission = 'denied';
      return 'denied';
    });
    await signedIn();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BKey');
    renderAt('/app/my');
    await user.click(await screen.findByRole('button', { name: '알림 받기' }));
    await user.click(screen.getByRole('button', { name: '아침 8:00' }));
    await user.click(screen.getByRole('button', { name: '이 시간으로 받기' }));
    expect(await screen.findByText('브라우저 설정에서 알림 권한을 변경할 수 있어.')).toBeInTheDocument();
    expect(server.pushSubs.size).toBe(0);
    expect(getNotifySettings().enabled).toBe(false);
  });

  it('서버 저장에 실패하면 켜졌다고 하지 않고, 만든 구독도 되돌린다', async () => {
    const user = userEvent.setup();
    installPushSupport();
    await signedIn();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BKey');
    renderAt('/app/my');
    await user.click(await screen.findByRole('button', { name: '알림 받기' }));
    await user.click(screen.getByRole('button', { name: '아침 8:00' }));
    server.online = false;
    await user.click(screen.getByRole('button', { name: '이 시간으로 받기' }));
    expect(await screen.findByText('지금은 알림을 켜지 못했어. 잠시 뒤에 다시 해줘.')).toBeInTheDocument();
    expect(getNotifySettings().enabled).toBe(false);
    expect(currentSub).toBeNull();
  });

  it('로그아웃하면 이 기기 알림을 끄고 서버 구독도 지운다', async () => {
    installPushSupport('granted');
    const device = await signedIn();
    await device.push!.save({ endpoint: 'https://push.example/sub-1', p256dh: 'p', auth: 'a', time: '19:00', frequency: 'daily', timezone: 'Asia/Seoul' });
    saveNotifySettings({ enabled: true, time: '19:00', frequency: 'daily', endpoint: 'https://push.example/sub-1' });
    const user = userEvent.setup();
    renderAt('/app/account');
    await user.click(await screen.findByRole('button', { name: '로그아웃' }));
    const confirm = screen.queryAllByRole('button', { name: /로그아웃/ }).at(-1);
    if (confirm) await user.click(confirm);
    await waitFor(() => expect(getNotifySettings().enabled).toBe(false));
    expect(server.pushSubs.size).toBe(0);
  });

  it('"기록 초기화"는 알림 설정을 지우지 않는다 (기기 설정)', async () => {
    const user = userEvent.setup();
    saveNotifySettings({ enabled: false, time: '08:00', frequency: 'daily' });
    localStorage.setItem(STORAGE_KEYS.records, '[]');
    renderAt('/app/my');
    await user.click(screen.getByRole('button', { name: '내 OFFROU 기록 초기화' }));
    const buttons = screen.getAllByRole('button', { name: /초기화|지우기/ });
    await user.click(buttons.at(-1)!);
    expect(localStorage.getItem(STORAGE_KEYS.notify)).not.toBeNull();
  });

  it('시간 표시·키 변환', () => {
    expect(formatTime('19:00')).toBe('저녁 7:00');
    expect(formatTime('08:05')).toBe('아침 8:05');
    expect(formatTime('12:30')).toBe('점심 12:30');
    expect(formatTime('00:00')).toBe('새벽 12:00');
    expect([...urlBase64ToUint8Array('AQID')]).toEqual([1, 2, 3]);
  });
});

describe('오프라인·업데이트 안내', () => {
  it('오프라인이면 작은 안내, 다시 연결되면 사라진다 (화면은 그대로 사용)', async () => {
    renderAt('/app');
    const set = (v: boolean) => Object.defineProperty(navigator, 'onLine', { value: v, configurable: true });
    set(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText('지금은 오프라인이야. 저장된 OFFROU는 계속 사용할 수 있어.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /쉬고 싶어/ })).toBeEnabled();
    set(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(/오프라인이야/)).not.toBeInTheDocument();
  });

  it('새 버전: [업데이트]를 눌러야만 적용, [나중에]는 이번 실행 동안 닫기', async () => {
    const user = userEvent.setup();
    const apply = vi.fn();
    setUpdateApplier(apply);
    renderAt('/app');
    expect(screen.queryByText('새로운 OFFROU가 준비됐어.')).not.toBeInTheDocument();
    act(() => markUpdateReady());
    expect(screen.getByText('새로운 OFFROU가 준비됐어.')).toBeInTheDocument();
    expect(apply).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '업데이트' }));
    expect(apply).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: '나중에' }));
    expect(screen.queryByText('새로운 OFFROU가 준비됐어.')).not.toBeInTheDocument();
  });

  it('경험·코스 진행 중에는 업데이트 안내로 흐름을 끊지 않는다', () => {
    act(() => markUpdateReady());
    renderAt('/app/experience/rest-window/play');
    expect(screen.queryByText('새로운 OFFROU가 준비됐어.')).not.toBeInTheDocument();
    renderAt('/app/course');
    expect(screen.queryByText('새로운 OFFROU가 준비됐어.')).not.toBeInTheDocument();
    renderAt('/app/my');
    expect(screen.getByText('새로운 OFFROU가 준비됐어.')).toBeInTheDocument();
  });

  it('서비스 워커 업데이트: 첫 설치엔 안내 없음, 요청했을 때만 한 번 새로고침 (루프 없음)', () => {
    const listeners = new Map<string, () => void>();
    const waiting = { postMessage: vi.fn() };
    const reg = {
      waiting: null as unknown,
      installing: null as unknown,
      update: vi.fn(async () => undefined),
      addEventListener: (t: string, fn: () => void) => listeners.set(`reg:${t}`, fn),
    };
    const container = {
      controller: null as unknown,
      addEventListener: (t: string, fn: () => void) => listeners.set(`c:${t}`, fn),
    };
    const reload = vi.fn();
    const win = { location: { reload } as unknown as Location, setInterval: vi.fn() as unknown as typeof setInterval };
    const doc = { visibilityState: 'visible' as DocumentVisibilityState, addEventListener: vi.fn() };

    // 처음 설치 (화면을 제어하는 이전 버전 없음)
    reg.waiting = waiting;
    watchForUpdates(reg as unknown as ServiceWorkerRegistration, container as unknown as ServiceWorkerContainer, win, doc);
    expect(screen.queryByText('새로운 OFFROU가 준비됐어.')).not.toBeInTheDocument();

    // 이전 버전이 있는 상태에서 새 버전 대기
    resetUpdatesForTesting();
    container.controller = {};
    watchForUpdates(reg as unknown as ServiceWorkerRegistration, container as unknown as ServiceWorkerContainer, win, doc);
    renderAt('/app/my');
    expect(screen.getByText('새로운 OFFROU가 준비됐어.')).toBeInTheDocument();

    // 사용자가 요청하지 않은 교체 → 새로고침 안 함
    listeners.get('c:controllerchange')!();
    expect(reload).not.toHaveBeenCalled();

    // 업데이트 클릭 → SKIP_WAITING → 교체 → 한 번만 새로고침
    act(() => screen.getByRole('button', { name: '업데이트' }).click());
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    listeners.get('c:controllerchange')!();
    listeners.get('c:controllerchange')!();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('모바일 사용성', () => {
  it('글자 입력 중에는 하단 내비를 숨겨 키보드·입력창과 겹치지 않게 한다', async () => {
    const user = userEvent.setup();
    renderAt('/app/discover');
    const nav = screen.getByRole('navigation', { name: '주요 메뉴' });
    expect(nav).not.toHaveAttribute('data-typing');
    const search = screen.getByRole('searchbox');
    await user.click(search);
    expect(screen.getByRole('navigation', { name: '주요 메뉴' })).toHaveAttribute('data-typing', 'true');
    await user.click(document.body);
    await waitFor(() => expect(screen.getByRole('navigation', { name: '주요 메뉴' })).not.toHaveAttribute('data-typing'));
  });

  it('뒤로 가기: 이전 화면으로 돌아가고 빈 화면이 없다', async () => {
    const user = userEvent.setup();
    const router = renderAt('/app');
    await user.click(screen.getByRole('link', { name: /MY/ }));
    expect(router.state.location.pathname).toBe('/app/my');
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe('/app');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('알림이 잘못된 콘텐츠 주소를 열어도 빈 화면 대신 안전한 화면으로', async () => {
    const r1 = renderAt('/app/experience/no-such-id/play');
    await waitFor(() => expect(r1.state.location.pathname).toBe('/app'));
    const r2 = renderAt('/app/experience/no-such-id');
    await waitFor(() => expect(r2.state.location.pathname).toBe('/app/discover'));
    const r3 = renderAt('/app/unknown/path');
    await waitFor(() => expect(r3.state.location.pathname).toBe('/app'));
  });
});
