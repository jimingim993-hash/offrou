/// <reference types="node" />
import { cleanup, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { routes } from '@/app/router';
import { STORAGE_KEYS, getRecovery, readList, resetAllData } from '@/services/storage';
import {
  CURRENT_STORAGE_VERSION,
  editJson,
  fillDefaults,
  readStorageMeta,
  runStorageMigrations,
  type Migration,
} from '@/services/storageMigrations';
import { getRecords, addRecord } from '@/services/records';
import { getSaved, toggleSaved } from '@/services/saved';
import { getSavedCourses, toggleSavedCourse } from '@/services/courses';
import { buildCourse } from '@/services/course';
import { getExperience, listExperiences } from '@/services/experiences';
import { backupLocalData, clearUserData, getBackup } from '@/services/account/link';
import { getNotifySettings, saveNotifySettings } from '@/pwa/notifications';
import { syncWithRemote } from '@/services/sync/engine';
import { setBackendForTesting } from '@/services/account/backend';
import { FakeServer } from './fakeBackend';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

/** 지금 버전에서 쓰던 그대로의 사용자 데이터 (원문) */
const LEGACY = {
  [STORAGE_KEYS.records]: JSON.stringify([
    { id: 'r1', experienceId: 'rest-window', title: '창밖 바라보기', categoryId: 'rest', minutes: 5, completedAt: '2026-09-01T10:00:00.000Z', moodId: 'rest' },
    { id: 'r2', experienceId: 'exp-detective', title: '동네 탐정', categoryId: 'experience', minutes: 10, completedAt: '2026-09-02T10:00:00.000Z', kind: 'story', endingTitle: '사건 해결' },
  ]),
  [STORAGE_KEYS.saved]: JSON.stringify([{ experienceId: 'out-sky', savedAt: '2026-09-03T00:00:00.000Z' }]),
  [STORAGE_KEYS.feedback]: JSON.stringify({ r1: { recordId: 'r1', experienceId: 'rest-window', categoryId: 'rest', value: 'good', at: '2026-09-01T10:05:00.000Z' } }),
  [STORAGE_KEYS.activity]: JSON.stringify({ recentShown: ['rest-window'], skipped: { 'out-sky': 1 }, started: {}, recentViewed: [] }),
  [STORAGE_KEYS.notify]: JSON.stringify({ enabled: false, time: '19:00', frequency: 'daily' }),
};

const seedLegacy = () => {
  for (const [k, v] of Object.entries(LEGACY)) localStorage.setItem(k, v);
};

/** "새 버전 로드" = 저장 구조 마이그레이션 실행 + 앱을 새로 그리기 */
const loadNewVersion = (path = '/app/my') => {
  runStorageMigrations();
  cleanup();
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);
};

afterEach(() => setBackendForTesting(undefined));

describe('업데이트해도 사용자 데이터가 남는다', () => {
  it('A · C: 기존 MY 기록·완료 기록 → 새 버전 로드 → 그대로 (화면에도 보임)', () => {
    seedLegacy();
    loadNewVersion();
    expect(getRecords().map((r) => r.id).sort()).toEqual(['r1', 'r2']);
    expect(screen.getByText('창밖 바라보기')).toBeInTheDocument();
    expect(screen.getByText('동네 탐정')).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.records)).toBe(LEGACY[STORAGE_KEYS.records]); // 원문 그대로
  });

  it('B: 저장한 콘텐츠 → 업데이트 → 그대로', () => {
    seedLegacy();
    toggleSaved('hobby-one-card');
    loadNewVersion('/app/my?tab=saved');
    expect(getSaved().map((s) => s.experienceId).sort()).toEqual(['hobby-one-card', 'out-sky']);
  });

  it('D: 저장한 코스 → 업데이트 → 그대로', () => {
    const course = buildCourse('calm', 20, ['rest-window', 'rest-ten-breaths'])!;
    toggleSavedCourse(course);
    loadNewVersion();
    expect(getSavedCourses().map((c) => c.id)).toEqual([course.id]);
  });

  it('E: 비회원 데이터(계정 연결 없음) → 업데이트 → 기록·피드백·설정·개인화 모두 유지', () => {
    seedLegacy();
    const before = Object.fromEntries(Object.keys(LEGACY).map((k) => [k, localStorage.getItem(k)]));
    loadNewVersion('/app');
    for (const [k, v] of Object.entries(before)) expect(localStorage.getItem(k), k).toBe(v);
    expect(getNotifySettings().time).toBe('19:00');
    expect(localStorage.getItem(STORAGE_KEYS.account)).toBeNull();
  });

  it('F: 로그인 사용자 → 업데이트·동기화 → 서버 기록도 로컬 기록도 유지 (합쳐질 뿐 지워지지 않음)', async () => {
    const server = new FakeServer();
    const device = server.createDevice();
    await device.signUp('me@offrou.app', 'long-enough-1');
    seedLegacy();
    await syncWithRemote(device.remote);
    runStorageMigrations();
    // 다른 기기에서 기록 하나 추가된 상황
    addRecord(getExperience('play-three-words')!);
    await syncWithRemote(device.remote);
    const remote = server.snapshotOf(server.userId('me@offrou.app')!).records.map((r) => r.id);
    expect(remote).toEqual(expect.arrayContaining(['r1', 'r2']));
    expect(getRecords().map((r) => r.experienceId)).toEqual(expect.arrayContaining(['rest-window', 'exp-detective', 'play-three-words']));
  });

  it('I: PWA 캐시 업데이트(서비스 워커 activate)는 사용자 데이터를 건드리지 않는다', () => {
    const sw = read('public/sw.js');
    expect(sw).not.toMatch(/localStorage|indexedDB|sessionStorage|clear\(\)/);
    // 지우는 대상은 'offrou-' 캐시뿐
    expect(sw).toMatch(/k\.startsWith\('offrou-'\)/);
    const reg = read('src/pwa/registerServiceWorker.ts') + read('src/pwa/updates.ts');
    expect(reg).not.toMatch(/localStorage|resetAllData|removeItem|\.clear\(/);
  });

  it('J: 서비스에서 사라진 콘텐츠도 과거 기록은 당시 제목·카테고리·날짜·시간 그대로 MY에 남는다', () => {
    localStorage.setItem(
      STORAGE_KEYS.records,
      JSON.stringify([
        { id: 'gone', experienceId: 'retired-content-123', title: '예전에 있던 시간', categoryId: 'play', minutes: 7, completedAt: '2026-08-01T09:00:00.000Z' },
      ]),
    );
    loadNewVersion();
    expect(getExperience('retired-content-123')).toBeUndefined();
    expect(getRecords()).toHaveLength(1);
    expect(screen.getByText('예전에 있던 시간')).toBeInTheDocument();
    expect(screen.getByText(/PLAY · 약 7분|PLAY/)).toBeInTheDocument();
  });
});

describe('저장 구조 버전 · 마이그레이션', () => {
  it('처음 실행: 버전 표시만 추가하고 데이터는 바꾸지 않는다 · 두 번 실행해도 같다', () => {
    seedLegacy();
    const r1 = runStorageMigrations();
    expect(r1).toMatchObject({ from: 0, to: CURRENT_STORAGE_VERSION, ok: true, changedKeys: [] });
    expect(readStorageMeta()?.storageVersion).toBe(CURRENT_STORAGE_VERSION);
    const r2 = runStorageMigrations();
    expect(r2).toMatchObject({ from: CURRENT_STORAGE_VERSION, changedKeys: [] });
    for (const [k, v] of Object.entries(LEGACY)) expect(localStorage.getItem(k)).toBe(v);
  });

  it('G · H: 구버전 → 신버전 — 기존 값은 유지하고 새 필드만 기본값', () => {
    seedLegacy();
    runStorageMigrations();
    const v2: Migration = {
      to: CURRENT_STORAGE_VERSION + 1,
      description: '기록에 source 필드 추가 (예시)',
      run: (data) => editJson(data, STORAGE_KEYS.records, (list) => (list as unknown[]).map((r) => fillDefaults(r, { source: 'local', title: '덮어쓰면 안 됨' }))),
    };
    const result = runStorageMigrations({ migrations: [{ to: 1, description: '', run: () => {} }, v2], target: v2.to });
    expect(result).toMatchObject({ ok: true, from: 1, to: v2.to, changedKeys: [STORAGE_KEYS.records] });
    const records = JSON.parse(localStorage.getItem(STORAGE_KEYS.records)!);
    expect(records[0]).toMatchObject({ id: 'r1', title: '창밖 바라보기', moodId: 'rest', source: 'local' });
    expect(records[1]).toMatchObject({ id: 'r2', title: '동네 탐정', endingTitle: '사건 해결', source: 'local' });
    // 바꾼 키의 원본은 백업에 남는다
    expect(JSON.parse(localStorage.getItem('offrou.migration-backup.v1')!).data[STORAGE_KEYS.records]).toBe(LEGACY[STORAGE_KEYS.records]);
    // 다른 키는 그대로
    expect(localStorage.getItem(STORAGE_KEYS.saved)).toBe(LEGACY[STORAGE_KEYS.saved]);
  });

  it('L: 마이그레이션 실패 → 원본은 하나도 바뀌지 않고, 빈 값으로 덮어쓰지 않는다', () => {
    seedLegacy();
    const broken: Migration[] = [
      { to: 1, description: '', run: (d) => editJson(d, STORAGE_KEYS.records, () => []) },
      { to: 2, description: '', run: () => { throw new Error('boom'); } },
    ];
    const result = runStorageMigrations({ migrations: broken, target: 2 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('boom');
    for (const [k, v] of Object.entries(LEGACY)) expect(localStorage.getItem(k)).toBe(v);
    expect(readStorageMeta()).toBeNull(); // 버전도 올리지 않는다 → 다음 실행에서 다시 시도
  });

  it('L: 결과가 올바른 JSON이 아니어도 저장하지 않는다', () => {
    seedLegacy();
    const result = runStorageMigrations({ migrations: [{ to: 1, description: '', run: (d) => d.set(STORAGE_KEYS.records, '{깨짐') }], target: 1 });
    expect(result.ok).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.records)).toBe(LEGACY[STORAGE_KEYS.records]);
  });

  it('L: 저장 도중 실패하면 바꾼 키를 원래대로 되돌린다', () => {
    seedLegacy();
    const realSet = Storage.prototype.setItem;
    let calls = 0;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      calls++;
      if (k === STORAGE_KEYS.meta) throw new Error('quota');
      return realSet.call(this, k, v);
    });
    try {
      const result = runStorageMigrations({
        migrations: [{ to: 1, description: '', run: (d) => editJson(d, STORAGE_KEYS.saved, () => []) }],
        target: 1,
      });
      expect(result.ok).toBe(false);
    } finally {
      spy.mockRestore();
    }
    expect(calls).toBeGreaterThan(0);
    expect(localStorage.getItem(STORAGE_KEYS.saved)).toBe(LEGACY[STORAGE_KEYS.saved]);
  });

  it('앱보다 높은 버전의 데이터(예전 앱으로 돌아간 경우)는 건드리지 않는다', () => {
    seedLegacy();
    localStorage.setItem(STORAGE_KEYS.meta, JSON.stringify({ storageVersion: 99, updatedAt: 'x', history: [] }));
    const result = runStorageMigrations();
    expect(result).toMatchObject({ from: 99, to: 99, ok: true, changedKeys: [] });
    for (const [k, v] of Object.entries(LEGACY)) expect(localStorage.getItem(k)).toBe(v);
  });
});

describe('K: 손상된 데이터 — 전체 초기화 없이 복구', () => {
  it('기록 중 일부만 깨졌으면 나머지는 그대로, 깨진 항목은 보관함에', () => {
    localStorage.setItem(
      STORAGE_KEYS.records,
      JSON.stringify([
        JSON.parse(LEGACY[STORAGE_KEYS.records])[0],
        { id: 42, broken: true },
        JSON.parse(LEGACY[STORAGE_KEYS.records])[1],
      ]),
    );
    expect(getRecords().map((r) => r.id).sort()).toEqual(['r1', 'r2']);
    // 새 기록을 더해도 정상 기록은 남고, 깨진 항목은 보관함에 있다
    addRecord(getExperience('rest-eyes')!);
    expect(getRecords().map((r) => r.id)).toEqual(expect.arrayContaining(['r1', 'r2']));
    expect(getRecovery().some((e) => e.key === STORAGE_KEYS.records && e.raw.includes('"broken":true'))).toBe(true);
  });

  it('JSON 자체가 깨졌으면 원본을 먼저 보관 → 다음 저장이 덮어써도 원본이 남는다', () => {
    const broken = '[{"id":"r1","experienceId":"rest-window","title":"창밖 바라보기","completedAt":"2026-09-01"'; // 잘림
    localStorage.setItem(STORAGE_KEYS.saved, broken);
    expect(getSaved()).toEqual([]); // 앱은 멈추지 않는다
    toggleSaved('out-sky');
    expect(getSaved().map((s) => s.experienceId)).toEqual(['out-sky']);
    expect(getRecovery()).toEqual([expect.objectContaining({ key: STORAGE_KEYS.saved, raw: broken, reason: 'unreadable' })]);
  });

  it('같은 깨진 원본은 한 번만 보관 · 보관함은 자동으로 지우지 않는다', () => {
    localStorage.setItem(STORAGE_KEYS.feedback, '{not json');
    for (let i = 0; i < 5; i++) readList(STORAGE_KEYS.feedback, (_v: unknown): _v is never => false);
    expect(getRecovery().filter((e) => e.key === STORAGE_KEYS.feedback)).toHaveLength(1);
  });

  it('깨진 저장값이 있어도 화면이 뜬다 (HOME · MY)', () => {
    localStorage.setItem(STORAGE_KEYS.records, '{{{');
    localStorage.setItem(STORAGE_KEYS.activity, 'null');
    localStorage.setItem(STORAGE_KEYS.savedCourses, '"x"');
    loadNewVersion('/app');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    loadNewVersion('/app/my');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

describe('계정 전환 · 보관본 · 초기화', () => {
  it('보관본이 이미 있으면 덮어쓰지 않고 보관 목록으로 옮긴다', () => {
    seedLegacy();
    backupLocalData(undefined, new Date('2026-09-10'));
    const first = getBackup();
    localStorage.setItem(STORAGE_KEYS.records, '[]');
    backupLocalData('user-2', new Date('2026-09-11'));
    expect(getBackup()?.fromUserId).toBe('user-2');
    const archive = JSON.parse(localStorage.getItem(STORAGE_KEYS.guestBackupArchive)!);
    expect(archive).toEqual([first]);
    expect(archive[0].snapshot.records.map((r: { id: string }) => r.id).sort()).toEqual(['r1', 'r2']);
  });

  it('계정 전환 정리(clearUserData)는 보관본·보관 목록·알림 설정·복구함·버전을 지우지 않는다', () => {
    seedLegacy();
    runStorageMigrations();
    backupLocalData();
    backupLocalData();
    saveNotifySettings({ enabled: false, time: '08:00', frequency: 'daily' });
    localStorage.setItem(STORAGE_KEYS.recovery, JSON.stringify([{ key: 'x', raw: 'y', reason: 'invalid', at: 'z' }]));
    clearUserData();
    for (const k of [STORAGE_KEYS.guestBackup, STORAGE_KEYS.guestBackupArchive, STORAGE_KEYS.notify, STORAGE_KEYS.recovery, STORAGE_KEYS.meta])
      expect(localStorage.getItem(k), k).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.records)).toBeNull();
  });

  it('사용자가 직접 고른 "기록 초기화"에서도 저장 구조 버전은 남는다', () => {
    seedLegacy();
    runStorageMigrations();
    resetAllData();
    expect(readStorageMeta()?.storageVersion).toBe(CURRENT_STORAGE_VERSION);
    expect(localStorage.getItem(STORAGE_KEYS.records)).toBeNull();
  });
});

describe('위험 코드 · 콘텐츠 id 안정성 · 서버 마이그레이션', () => {
  it('앱 코드에 localStorage.clear()·sessionStorage.clear()가 없다 (테스트 설정 제외)', () => {
    const walk = (dir: string): string[] =>
      readdirSync(join(root, dir), { withFileTypes: true }).flatMap((d) =>
        d.isDirectory() ? walk(`${dir}/${d.name}`) : /\.(ts|tsx|js)$/.test(d.name) ? [`${dir}/${d.name}`] : [],
      );
    const files = [...walk('src').filter((f) => !f.startsWith('src/test/')), 'public/sw.js'];
    for (const f of files) expect(read(f), f).not.toMatch(/(localStorage|sessionStorage)\.clear\(\)/);
    // resetAllData는 사용자 동작(초기화·로그아웃하며 지우기·계정 전환)에서만
    const callers = files.filter((f) => /resetAllData\(/.test(read(f)) && !f.endsWith('services/storage.ts'));
    expect(callers.sort()).toEqual(['src/features/account/AccountProvider.tsx', 'src/features/my/ResetData.tsx', 'src/services/account/link.ts']);
    // 테스트 설정의 초기화는 테스트 환경에서만
    expect(read('src/test/setup.ts')).toMatch(/afterEach/);
    expect(read('src/main.tsx')).not.toMatch(/setup|resetAllData|clear\(/);
  });

  it('지금까지 쓰인 콘텐츠 id는 모두 그대로 있다 (기록·저장과 연결)', () => {
    const ids = new Set(listExperiences().map((e) => e.id));
    const KNOWN = [
      'rest-two-songs', 'rest-window', 'rest-dim-light', 'rest-warm-drink', 'rest-screen-down', 'rest-ten-breaths', 'rest-blanket',
      'rest-slow-water', 'rest-quiet-sounds', 'rest-foot-bath', 'play-color-hunt', 'play-three-words', 'play-old-photo', 'play-funny-object',
      'play-doodle', 'play-paper-plane', 'play-shadow-puppets', 'play-one-song-dance', 'play-left-hand', 'play-tiny-museum',
      'play-small-question', 'play-photo-mission', 'hobby-new-word', 'hobby-drawing', 'hobby-one-paragraph', 'hobby-new-genre',
      'hobby-photo-theme', 'hobby-paper-craft', 'hobby-three-line-poem', 'hobby-hum-melody', 'hobby-handwriting', 'hobby-short-video',
      'exp-bookstore', 'exp-radio-dj', 'exp-small-hotel', 'exp-detective', 'exp-strange-city', 'exp-last-cafe', 'exp-flower-shop',
      'exp-night-train', 'exp-museum-night', 'exp-postman', 'out-sky', 'out-new-route', 'out-scenery', 'out-new-menu', 'out-get-off-early',
      'out-new-place', 'out-aimless-walk', 'out-park-hour', 'out-door-sounds', 'out-library', 'out-sunset',
    ];
    for (const id of KNOWN) expect(ids.has(id), id).toBe(true);
    expect(ids.size).toBe(listExperiences().length); // id 중복 없음
  });

  it('Supabase 마이그레이션에 사용자 데이터를 지우는 문장이 없다', () => {
    const dir = join(root, 'supabase/migrations');
    for (const f of readdirSync(dir)) {
      const sql = readFileSync(join(dir, f), 'utf8')
        .split('\n')
        .filter((l) => !l.trim().startsWith('--'))
        .join('\n')
        .toLowerCase();
      expect(sql, f).not.toMatch(/drop table|truncate|delete from public\.offrou_(completions|saved|feedback|taste|course_runs|saved_courses)\b(?![^;]*where)/);
      expect(sql, f).not.toMatch(/drop column/);
    }
  });
});
