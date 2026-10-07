// @vitest-environment node
/// <reference types="node" />
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildVersion, injectServiceWorkerBuild, precacheFiles } from '../../pwa-build';
import {
  GENTLE_MESSAGES as SERVER_MESSAGES,
  SOMETIMES_DAYS,
  buildPayload,
  isDue,
  isGoneStatus,
  localParts,
  pickMessage,
} from '../../supabase/functions/send-new-time/schedule';
import { GENTLE_MESSAGES as APP_MESSAGES } from '@/pwa/notifications';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const SW_SOURCE = read('public/sw.js');
const ORIGIN = 'https://offrou.test';

const FORBIDDEN = [
  '오늘 아직 OFFROU를 안 했어요',
  '연속 기록이 끊겨요',
  '지금 안 하면 놓쳐요',
  '다른 사람들은 이미 했어요',
  '목표를 달성하지 못했어요',
];

/* ─── 가짜 서비스 워커 환경 ─── */

class FakeCache {
  store = new Map<string, Response>();
  async addAll(urls: string[]) {
    for (const u of urls) this.store.set(new URL(u, ORIGIN).href, new Response(`cached ${u}`));
  }
  async put(req: Request | string, res: Response) {
    this.store.set(typeof req === 'string' ? new URL(req, ORIGIN).href : req.url, res);
  }
  async match(req: Request | string) {
    return this.store.get(typeof req === 'string' ? new URL(req, ORIGIN).href : req.url)?.clone();
  }
}

function loadWorker(source = SW_SOURCE, opts: { network?: (req: Request) => Promise<Response>; existingCaches?: string[] } = {}) {
  const handlers = new Map<string, (event: unknown) => void>();
  const cacheMap = new Map<string, FakeCache>();
  for (const name of opts.existingCaches ?? []) cacheMap.set(name, new FakeCache());
  const caches = {
    open: async (name: string) => {
      if (!cacheMap.has(name)) cacheMap.set(name, new FakeCache());
      return cacheMap.get(name)!;
    },
    keys: async () => [...cacheMap.keys()],
    delete: async (name: string) => cacheMap.delete(name),
  };
  const windows: { url: string; focus: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn> }[] = [];
  const self = {
    location: new URL(ORIGIN),
    addEventListener: (type: string, fn: (e: unknown) => void) => handlers.set(type, fn),
    skipWaiting: vi.fn(),
    clients: {
      claim: vi.fn(async () => undefined),
      matchAll: vi.fn(async () => windows),
      openWindow: vi.fn(async () => null),
    },
    registration: { showNotification: vi.fn(async (..._args: unknown[]) => undefined) },
  };
  const fetchFn = vi.fn(opts.network ?? (async () => new Response('network')));
  new Function('self', 'caches', 'fetch', source)(self, caches, fetchFn);

  /** 이벤트를 보내고 waitUntil/respondWith가 끝날 때까지 기다린다 */
  const dispatch = async (type: string, extra: Record<string, unknown> = {}) => {
    const waits: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    const event = {
      ...extra,
      waitUntil: (p: Promise<unknown>) => waits.push(p),
      respondWith: (p: Promise<Response>) => {
        response = p;
      },
    };
    handlers.get(type)?.(event);
    await Promise.all(waits);
    return { response: response ? await response : undefined, responded: response !== undefined };
  };
  return { self, caches: cacheMap, dispatch, fetchFn, windows, handlers };
}

const BUILT = injectServiceWorkerBuild(SW_SOURCE, ['/index.html', '/assets/index-abc.js', '/assets/index-abc.css'], 'v2');
const navRequest = (path: string) => Object.assign(new Request(ORIGIN + path), {}) as Request;
const asNavigate = (req: Request) => new Proxy(req, { get: (t, k) => (k === 'mode' ? 'navigate' : Reflect.get(t, k, t)) });

describe('서비스 워커 — 설치·업데이트', () => {
  it('설치 때 앱 셸·빌드 파일·아이콘을 모두 미리 저장하고, 스스로 바로 교체하지 않는다', async () => {
    const sw = loadWorker(BUILT);
    await sw.dispatch('install');
    const cache = sw.caches.get('offrou-v2')!;
    for (const p of ['/index.html', '/assets/index-abc.js', '/assets/index-abc.css', '/manifest.webmanifest', '/icons/icon-192.png'])
      expect(cache.store.has(ORIGIN + p)).toBe(true);
    expect(sw.self.skipWaiting).not.toHaveBeenCalled();
  });

  it('사용자가 "업데이트"를 눌렀을 때(SKIP_WAITING)만 새 버전으로 넘어간다', async () => {
    const sw = loadWorker(BUILT);
    await sw.dispatch('message', { data: { type: 'HELLO' } });
    expect(sw.self.skipWaiting).not.toHaveBeenCalled();
    await sw.dispatch('message', { data: { type: 'SKIP_WAITING' } });
    expect(sw.self.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('새 버전이 켜지면 예전 OFFROU 캐시만 지운다 (글꼴·다른 캐시는 남김)', async () => {
    const sw = loadWorker(BUILT, { existingCaches: ['offrou-v1', 'offrou-fonts', 'other-app'] });
    await sw.dispatch('activate');
    expect([...sw.caches.keys()].sort()).toEqual(['offrou-fonts', 'other-app']);
    expect(sw.self.clients.claim).toHaveBeenCalled();
  });

  it('빌드 전 원본은 dev 버전·빈 목록이고, 빌드 주입은 목록에 따라 버전을 바꾼다', () => {
    expect(SW_SOURCE).toContain("{ version: 'dev', files: [] }");
    const a = buildVersion(['/assets/a-1.js', '/index.html']);
    expect(buildVersion(['/index.html', '/assets/a-1.js'])).toBe(a);
    expect(buildVersion(['/assets/a-2.js', '/index.html'])).not.toBe(a);
    const out = injectServiceWorkerBuild(SW_SOURCE, ['/x.js']);
    expect(out).toContain('"files":["/x.js"]');
    expect(() => injectServiceWorkerBuild('const x = 1;', [])).toThrow();
    expect(precacheFiles(['index.html', 'assets/a.js', 'assets/a.js.map', 'sw.js'])).toEqual(['/assets/a.js', '/index.html']);
  });

  it('주입한 결과도 그대로 실행되는 스크립트다', () => {
    expect(() => loadWorker(BUILT)).not.toThrow();
  });
});

describe('서비스 워커 — 오프라인', () => {
  it('연결이 없으면 페이지 이동에 저장된 앱 셸(/index.html)을 돌려준다 → /app·경험 화면이 열린다', async () => {
    const sw = loadWorker(BUILT, { network: async () => Promise.reject(new TypeError('Failed to fetch')) });
    await sw.dispatch('install');
    for (const path of ['/app', '/app/my', '/app/experience/x/play']) {
      const { response } = await sw.dispatch('fetch', { request: asNavigate(navRequest(path)) });
      expect(await response!.text()).toBe('cached /index.html');
    }
  });

  it('연결되어 있으면 최신 페이지를 받고 앱 셸 사본도 새로 고친다', async () => {
    const sw = loadWorker(BUILT, { network: async () => new Response('fresh html') });
    await sw.dispatch('install');
    const { response } = await sw.dispatch('fetch', { request: asNavigate(navRequest('/app')) });
    expect(await response!.text()).toBe('fresh html');
    await new Promise((r) => setTimeout(r, 0));
    expect(await sw.caches.get('offrou-v2')!.store.get(ORIGIN + '/index.html')!.text()).toBe('fresh html');
  });

  it('정적 파일은 저장본을 먼저 쓴다', async () => {
    const sw = loadWorker(BUILT);
    await sw.dispatch('install');
    const { response } = await sw.dispatch('fetch', { request: new Request(ORIGIN + '/assets/index-abc.js') });
    expect(await response!.text()).toBe('cached /assets/index-abc.js');
    expect(sw.fetchFn).not.toHaveBeenCalled();
  });

  it('서버 데이터(Supabase 등 다른 출처)와 GET이 아닌 요청은 건드리지 않는다', async () => {
    const sw = loadWorker(BUILT);
    const r1 = await sw.dispatch('fetch', { request: new Request('https://abc.supabase.co/rest/v1/offrou_completions') });
    const r2 = await sw.dispatch('fetch', { request: new Request(ORIGIN + '/api', { method: 'POST', body: 'x' }) });
    expect(r1.responded).toBe(false);
    expect(r2.responded).toBe(false);
  });
});

describe('서비스 워커 — 알림', () => {
  const pushEvent = (payload?: unknown) => ({
    data: payload === undefined ? null : { json: () => (typeof payload === 'string' ? JSON.parse(payload) : payload) },
  });

  it('내용이 없으면 부드러운 기본 문구로, 누르면 /app으로', async () => {
    const sw = loadWorker(BUILT);
    await sw.dispatch('push', pushEvent());
    const [title, options] = sw.self.registration.showNotification.mock.calls[0] as unknown as [string, { body: string; data: { url: string }; icon: string }];
    expect(title).toBe('OFFROU');
    expect(APP_MESSAGES).toContain(options.body);
    expect(options.data.url).toBe('/app');
    expect(options.icon).toBe('/icons/icon-192.png');
  });

  it('알림 주소는 OFFROU 서비스 안(/app…)으로만 — 다른 사이트·이상한 값은 /app', async () => {
    const cases: [unknown, string][] = [
      ['/app/experience/abc', '/app/experience/abc'],
      ['https://evil.example/app', '/app'],
      ['javascript:alert(1)', '/app'],
      ['/admin', '/app'],
      [42, '/app'],
    ];
    for (const [url, expected] of cases) {
      const sw = loadWorker(BUILT);
      await sw.dispatch('push', pushEvent({ body: '오늘 이런 시간은 어때?', url }));
      const options = (sw.self.registration.showNotification.mock.calls[0] as unknown[])[1] as { data: { url: string } };
      expect(options.data.url).toBe(expected);
    }
  });

  it('알림을 누르면 열린 OFFROU 창으로 가고, 없으면 새 창으로 연다', async () => {
    const sw = loadWorker(BUILT);
    const notification = { close: vi.fn(), data: { url: '/app' } };
    await sw.dispatch('notificationclick', { notification });
    expect(notification.close).toHaveBeenCalled();
    expect(sw.self.clients.openWindow).toHaveBeenCalledWith('/app');

    const sw2 = loadWorker(BUILT);
    sw2.windows.push({ url: ORIGIN + '/app/my', focus: vi.fn(async () => undefined), navigate: vi.fn(async () => undefined) });
    await sw2.dispatch('notificationclick', { notification: { close: vi.fn(), data: { url: 'https://evil.example' } } });
    expect(sw2.windows[0].focus).toHaveBeenCalled();
    expect(sw2.windows[0].navigate).toHaveBeenCalledWith('/app');
    expect(sw2.self.clients.openWindow).not.toHaveBeenCalled();
  });

  it('앱·서비스 워커·서버의 알림 문구가 같고, 재촉·비교·죄책감 문구는 없다', () => {
    expect([...SERVER_MESSAGES]).toEqual([...APP_MESSAGES]);
    for (const m of APP_MESSAGES) expect(SW_SOURCE).toContain(m);
    const all = [SW_SOURCE, read('supabase/functions/send-new-time/schedule.ts'), read('src/pwa/notifications.ts'), read('src/features/my/NotificationSettings.tsx')].join('\n');
    for (const f of FORBIDDEN) expect(all).not.toContain(f);
    expect(all).not.toMatch(/연속|스트릭|streak|놓쳐|다른 사람들/i);
  });
});

describe('알림 발송 규칙 (Edge Function)', () => {
  // 2026-10-04(일) 19:05 KST
  const sundayEvening = new Date('2026-10-04T10:05:00Z');
  const row = { notify_time: '19:00', frequency: 'daily' as const, timezone: 'Asia/Seoul', last_sent_on: null };

  it('고른 시간이 지나고 1시간 안이면 보낸다, 같은 날 두 번은 보내지 않는다', () => {
    expect(localParts(sundayEvening, 'Asia/Seoul')).toEqual({ date: '2026-10-04', weekday: 0, minutes: 19 * 60 + 5 });
    expect(isDue(row, sundayEvening)).toBe(true);
    expect(isDue({ ...row, last_sent_on: '2026-10-04' }, sundayEvening)).toBe(false);
    expect(isDue({ ...row, last_sent_on: '2026-10-03' }, sundayEvening)).toBe(true);
    expect(isDue({ ...row, notify_time: '19:30' }, sundayEvening)).toBe(false); // 아직
    expect(isDue({ ...row, notify_time: '18:00' }, sundayEvening)).toBe(false); // 1시간 넘게 지남
  });

  it('사용자 시간대를 기준으로 한다', () => {
    // 같은 순간이 뉴욕에서는 06:05
    expect(isDue({ ...row, timezone: 'America/New_York', notify_time: '06:00' }, sundayEvening)).toBe(true);
    expect(isDue({ ...row, timezone: 'America/New_York' }, sundayEvening)).toBe(false);
    // 알 수 없는 시간대는 서울로
    expect(isDue({ ...row, timezone: 'Not/AZone' }, sundayEvening)).toBe(true);
  });

  it('"가끔"은 화·금에만', () => {
    expect(SOMETIMES_DAYS).toEqual([2, 5]);
    expect(isDue({ ...row, frequency: 'sometimes' }, sundayEvening)).toBe(false);
    const tuesday = new Date('2026-10-06T10:05:00Z');
    expect(isDue({ ...row, frequency: 'sometimes' }, tuesday)).toBe(true);
  });

  it('시간 형식이 이상하면 보내지 않는다', () => {
    for (const t of ['7:00', '24:00', '19:60', '', 'evening']) expect(isDue({ ...row, notify_time: t }, sundayEvening)).toBe(false);
  });

  it('문구·주소·만료 처리', () => {
    expect(pickMessage('2026-10-04')).toBe(pickMessage('2026-10-04'));
    const days = Array.from({ length: 14 }, (_, i) => pickMessage(`2026-10-${String(i + 1).padStart(2, '0')}`));
    expect(new Set(days).size).toBeGreaterThan(1);
    for (const d of days) expect(SERVER_MESSAGES).toContain(d);
    expect(buildPayload('2026-10-04')).toMatchObject({ title: 'OFFROU', url: '/app' });
    expect(isGoneStatus(404)).toBe(true);
    expect(isGoneStatus(410)).toBe(true);
    expect(isGoneStatus(500)).toBe(false);
    expect(isGoneStatus(undefined)).toBe(false);
  });
});

/* ─── 설치·화면 설정 정적 검사 ─── */

const pngSize = (p: string) => {
  const buf = readFileSync(join(root, p));
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
};

describe('설치 정보 (manifest·아이콘·index.html)', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));

  it('manifest: 이름·시작 주소·표시 방식·색', () => {
    expect(manifest).toMatchObject({
      name: 'OFFROU',
      short_name: 'OFFROU',
      start_url: '/app',
      scope: '/',
      display: 'standalone',
      lang: 'ko',
    });
    expect(manifest.background_color).toMatch(/^#[0-9A-F]{6}$/i);
    expect(manifest.theme_color).toMatch(/^#[0-9A-F]{6}$/i);
    // 화면 방향을 강제하지 않는다
    expect(manifest.orientation).toBeUndefined();
  });

  it('아이콘: 192·512·maskable 512 PNG가 실제 크기로 있다', () => {
    const icons = manifest.icons as { src: string; sizes: string; purpose: string; type: string }[];
    const need = [
      ['192x192', 'any'],
      ['512x512', 'any'],
      ['512x512', 'maskable'],
    ];
    for (const [sizes, purpose] of need) {
      const icon = icons.find((i) => i.sizes === sizes && i.purpose === purpose && i.type === 'image/png');
      expect(icon, `${sizes} ${purpose}`).toBeDefined();
      const [w, h] = pngSize(join('public', icon!.src));
      expect(`${w}x${h}`).toBe(sizes);
    }
    expect(pngSize('public/icons/apple-touch-icon.png')).toEqual([180, 180]);
    expect(pngSize('public/icons/favicon-32.png')).toEqual([32, 32]);
    // 임시 아이콘이라는 표시와 교체 목록
    // 공식 로고 기반 아이콘과 교체 안내
    expect(read('public/icons/README.md')).toMatch(/공식 로고/);
  });

  it('index.html: 안전 영역(viewport-fit)·키보드·애플 아이콘·흰 화면 방지', () => {
    const html = read('index.html');
    expect(html).toMatch(/name="viewport"[^>]*viewport-fit=cover/);
    expect(html).toMatch(/interactive-widget=resizes-content/);
    expect(html).not.toMatch(/user-scalable=no|maximum-scale=1/);
    expect(html).toContain('rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png"');
    expect(html).toContain('rel="manifest"');
    expect(html).toMatch(/<style>[\s\S]*html \{ background/);
  });

  it('안전 영역: 상단 본문·하단 내비·시트·업데이트 안내가 노치/홈 표시줄을 피한다', () => {
    expect(read('src/components/layout/AppShell.module.css')).toContain('env(safe-area-inset-top)');
    expect(read('src/components/layout/AppShell.module.css')).toContain('env(safe-area-inset-bottom)');
    expect(read('src/components/layout/BottomNav.module.css')).toContain('env(safe-area-inset-bottom)');
    expect(read('src/components/ui/Sheet.module.css')).toContain('env(safe-area-inset-bottom)');
    expect(read('src/components/layout/StatusNotices.module.css')).toContain('env(safe-area-inset-bottom)');
  });
});

describe('비밀값은 프런트엔드에 없다', () => {
  it('VAPID private key·service role key는 서버 함수에서만 쓴다', () => {
    const files = [
      'src/pwa/notifications.ts',
      'src/pwa/install.ts',
      'src/pwa/registerServiceWorker.ts',
      'src/features/my/NotificationSettings.tsx',
      'src/services/account/supabaseBackend.ts',
      'src/vite-env.d.ts',
      'public/sw.js',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/VAPID_PRIVATE|PRIVATE_KEY|SERVICE_ROLE|service_role_key|CRON_SECRET/);
    }
    const fn = read('supabase/functions/send-new-time/index.ts');
    expect(fn).toContain("env('VAPID_PRIVATE_KEY')");
    expect(fn).toContain("env('SUPABASE_SERVICE_ROLE_KEY')");
    expect(fn).toContain('x-cron-secret');
  });

  it('.env.example에는 값이 없고 공개 키 자리만 있다', () => {
    const example = read('.env.example');
    for (const line of example.split('\n').filter((l) => /^[A-Z_]+=/.test(l))) expect(line).toMatch(/=$/);
    expect(example).toContain('VITE_VAPID_PUBLIC_KEY=');
    expect(example).not.toMatch(/^VAPID_PRIVATE_KEY=/m);
  });

  it('알림 마이그레이션: 본인 구독만, 계정 삭제 시 함께 삭제, 형식 검사', () => {
    const sql = read('supabase/migrations/20261005000000_offrou_push.sql');
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('on delete cascade');
    expect(sql).toMatch(/notify_time text not null check/);
    expect(sql).toMatch(/frequency in \('daily', 'sometimes'\)/);
    expect(sql).toMatch(/endpoint ~ '\^https:\/\/'/);
    expect(sql).toContain('security definer');
    expect(sql).toMatch(/revoke all on public\.offrou_push_subscriptions from anon/);
    expect(existsSync(join(root, 'supabase/functions/send-new-time/index.ts'))).toBe(true);
  });
});
