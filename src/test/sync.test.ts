/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getExperience } from '@/services/experiences';
import { addRecord, getRecords } from '@/services/records';
import { getSaved, getSavedRaw, toggleSaved } from '@/services/saved';
import { diffForPush, mergeActivity, mergeFeedback, mergeRecords, mergeSaved, mergeSnapshots } from '@/services/sync/merge';
import { syncWithRemote, type RemoteStore } from '@/services/sync/engine';
import { EMPTY_SNAPSHOT, readLocalSnapshot, type UserSnapshot } from '@/services/sync/snapshot';
import { fromCompletionRow, pushToRows, toCompletionRow } from '@/services/account/supabaseRows';
import { mapSupabaseError } from '@/services/account/supabaseBackend';
import { AccountError, ERROR_MESSAGES, messageFor, validateEmail, validatePassword } from '@/services/account/errors';
import { backupLocalData, getBackup, clearUserData, setLink, getLink } from '@/services/account/link';
import type { FeedbackEntry, OffrouRecord } from '@/types/offrou';

const rec = (id: string, experienceId: string, completedAt: string, extra: Partial<OffrouRecord> = {}): OffrouRecord => ({
  id,
  experienceId,
  title: getExperience(experienceId)!.title,
  categoryId: getExperience(experienceId)!.categoryId,
  minutes: getExperience(experienceId)!.minutes,
  completedAt,
  ...extra,
});

const snap = (patch: Partial<UserSnapshot>): UserSnapshot => ({ ...EMPTY_SNAPSHOT, ...patch });

describe('병합: 지우기보다 합치기', () => {
  it('휴대폰 A·B + 태블릿 A·C → A·B·C', () => {
    const A = rec('a', 'rest-window', '2026-10-01T01:00:00.000Z');
    const B = rec('b', 'exp-radio-dj', '2026-10-02T01:00:00.000Z');
    const C = rec('c', 'out-sky', '2026-10-03T01:00:00.000Z');
    const merged = mergeRecords([A, B], [A, C]);
    expect(merged.map((r) => r.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('같은 완료가 다른 id로 두 번 들어와도 하나로 (같은 경험·같은 시각)', () => {
    const t = '2026-10-01T01:00:00.000Z';
    const merged = mergeRecords([rec('x2', 'rest-window', t)], [rec('x1', 'rest-window', t)]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('x1');
  });

  it('같은 기록이면 결말 정보를 잃지 않는다', () => {
    const t = '2026-10-01T01:00:00.000Z';
    const merged = mergeRecords([rec('r', 'exp-radio-dj', t)], [rec('r', 'exp-radio-dj', t, { endingTitle: '조용한 밤의 방송' })]);
    expect(merged[0].endingTitle).toBe('조용한 밤의 방송');
  });

  it('저장: 나중에 일어난 저장/취소가 이긴다 (취소가 되살아나지 않음)', () => {
    const saved = { experienceId: 'out-sky', savedAt: '2026-10-01T00:00:00.000Z' };
    const removed = { ...saved, removedAt: '2026-10-02T00:00:00.000Z' };
    expect(mergeSaved([saved], [removed])[0].removedAt).toBeDefined();
    expect(mergeSaved([removed], [saved])[0].removedAt).toBeDefined();
    const resaved = { experienceId: 'out-sky', savedAt: '2026-10-03T00:00:00.000Z' };
    expect(mergeSaved([removed], [resaved])[0]).toEqual(resaved);
    // 서로 다른 저장은 모두 남는다
    expect(mergeSaved([saved], [{ experienceId: 'rest-window', savedAt: saved.savedAt }])).toHaveLength(2);
  });

  it('피드백: 기록별 마지막 값', () => {
    const f = (value: 'good' | 'meh', at: string): FeedbackEntry => ({ recordId: 'r1', experienceId: 'rest-window', categoryId: 'rest', value, at });
    expect(mergeFeedback([f('good', '2026-10-01T00:00:00Z')], [f('meh', '2026-10-02T00:00:00Z')])[0].value).toBe('meh');
  });

  it('사용 신호: 횟수는 큰 값, 최근 목록은 이 기기 우선', () => {
    const a = { recentShown: ['x', 'y'], skipped: { x: 1 }, started: { s: 3 }, recentViewed: ['v1'] };
    const b = { recentShown: ['z', 'x'], skipped: { x: 4, w: 1 }, started: { s: 1 }, recentViewed: ['v2', 'v1'] };
    expect(mergeActivity(a, b)).toEqual({
      recentShown: ['z', 'x', 'y'],
      skipped: { x: 4, w: 1 },
      started: { s: 3 },
      recentViewed: ['v1', 'v2'],
    });
  });

  it('서버에는 새로 생기거나 바뀐 것만 올린다', () => {
    const A = rec('a', 'rest-window', '2026-10-01T01:00:00.000Z');
    const B = rec('b', 'out-sky', '2026-10-02T01:00:00.000Z');
    const server = snap({ records: [A] });
    const merged = mergeSnapshots(snap({ records: [A, B] }), server);
    const diff = diffForPush(merged, server);
    expect(diff.records.map((r) => r.id)).toEqual(['b']);
    expect(diff.activity).toBeUndefined();
  });
});

describe('동기화 한 번 (local-first)', () => {
  const remoteWith = (server: UserSnapshot, fail = false) => {
    const pushed: unknown[] = [];
    const remote: RemoteStore = {
      pull: async () => {
        if (fail) throw new TypeError('Failed to fetch');
        return server;
      },
      push: async (changes) => {
        pushed.push(changes);
      },
    };
    return { remote, pushed };
  };

  it('서버 기록을 받아 합치고, 이 기기에만 있던 것을 올린다', async () => {
    const mine = addRecord(getExperience('rest-window')!);
    const theirs = rec('server-1', 'out-sky', '2026-09-01T00:00:00.000Z');
    const { remote, pushed } = remoteWith(snap({ records: [theirs] }));
    await syncWithRemote(remote);
    expect(getRecords().map((r) => r.id).sort()).toEqual([mine.id, 'server-1'].sort());
    expect((pushed[0] as { records: OffrouRecord[] }).records.map((r) => r.id)).toEqual([mine.id]);
  });

  it('네트워크가 실패해도 이 기기 기록은 그대로', async () => {
    addRecord(getExperience('rest-window')!);
    toggleSaved('out-sky');
    const before = readLocalSnapshot();
    const { remote } = remoteWith(EMPTY_SNAPSHOT, true);
    await expect(syncWithRemote(remote)).rejects.toThrow();
    expect(readLocalSnapshot()).toEqual(before);
  });
});

describe('저장 tombstone과 이전 데이터 호환', () => {
  it('취소해도 기록은 남고(removedAt), 화면에는 안 보인다', () => {
    toggleSaved('out-sky');
    toggleSaved('out-sky');
    expect(getSaved()).toEqual([]);
    expect(getSavedRaw()[0].removedAt).toBeDefined();
    expect(toggleSaved('out-sky')).toBe(true);
    expect(getSaved()).toHaveLength(1);
  });

  it('4·5단계 저장 형식(removedAt 없음)은 저장됨으로 읽는다', () => {
    localStorage.setItem('offrou.saved.v1', JSON.stringify([{ experienceId: 'rest-window', savedAt: '2026-10-01T00:00:00.000Z' }]));
    expect(getSaved().map((s) => s.experienceId)).toEqual(['rest-window']);
  });
});

describe('서버 행 변환', () => {
  it('완료 기록 ↔ 행 왕복, 사용자 id는 로그인한 사용자로만', () => {
    const r = rec('r1', 'exp-radio-dj', '2026-10-01T01:00:00.000Z', { endingTitle: '조용한 밤의 방송', kind: 'story', moodId: 'new' });
    const row = toCompletionRow('user-A', r);
    expect(row.user_id).toBe('user-A');
    expect(fromCompletionRow(row)).toEqual(r);
    const rows = pushToRows('user-A', { records: [r], saved: [], feedback: [], activity: undefined, courseRuns: [], savedCourses: [] });
    expect(rows.completions.every((x) => x.user_id === 'user-A')).toBe(true);
    expect(rows.taste).toBeNull();
  });

  it('긴 값은 서버 제한에 맞게 자른다', () => {
    const row = toCompletionRow('u', rec('r'.repeat(100), 'rest-window', '2026-10-01T00:00:00.000Z', { endingTitle: '가'.repeat(300) }));
    expect(row.id).toHaveLength(64);
    expect(row.ending_title).toHaveLength(100);
  });
});

describe('오류 문구', () => {
  it('Supabase 오류를 사용자 문장으로 (원문 노출 X)', () => {
    const cases: [unknown, string][] = [
      [{ name: 'AuthApiError', code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' }, ERROR_MESSAGES.invalid_credentials],
      [{ name: 'AuthApiError', code: 'user_already_exists', status: 422 }, ERROR_MESSAGES.email_taken],
      [{ name: 'AuthApiError', code: 'weak_password', status: 422 }, ERROR_MESSAGES.weak_password],
      [{ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }, ERROR_MESSAGES.network],
      [{ name: 'AuthApiError', status: 429 }, ERROR_MESSAGES.rate_limited],
      [{ name: 'Weird', message: 'secret internal detail' }, ERROR_MESSAGES.unknown],
    ];
    for (const [raw, expected] of cases) {
      const text = messageFor(mapSupabaseError(raw));
      expect(text).toBe(expected);
      expect(text).not.toMatch(/AuthApiError|Invalid login|secret|fetch/i);
    }
  });

  it('입력값 기본 검증', () => {
    expect(validateEmail('')).toBeTruthy();
    expect(validateEmail('not-an-email')).toBeTruthy();
    expect(validateEmail(' me@offrou.app ')).toBeNull();
    expect(validatePassword('short')).toMatch(/8자 이상/);
    expect(validatePassword('a'.repeat(73))).toMatch(/72자 이하/);
    expect(validatePassword('long-enough-1')).toBeNull();
    expect(new AccountError('network').message).toBe('network');
  });
});

describe('계정 연결 정보와 보관본', () => {
  it('새로 시작하기용 보관본은 기록을 그대로 담고, 사용자 기록만 비워도 남는다', () => {
    addRecord(getExperience('rest-window')!);
    setLink({ id: 'u1', email: 'a@b.co' });
    backupLocalData();
    clearUserData();
    expect(getRecords()).toEqual([]);
    expect(getLink()?.userId).toBe('u1');
    expect(getBackup()?.snapshot.records).toHaveLength(1);
  });
});

describe('보안 기본 점검 (정적)', () => {
  // vitest는 프로젝트 루트에서 실행된다
  const root = process.cwd();
  const sql = readFileSync(join(root, 'supabase/migrations/20261003000000_offrou_user_data.sql'), 'utf8');

  it('모든 사용자 테이블에 RLS와 본인 행 정책이 있다', () => {
    const tables = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);
    expect(tables).toEqual(['offrou_completions', 'offrou_saved', 'offrou_feedback', 'offrou_taste']);
    for (const t of tables) {
      expect(sql).toContain(`alter table public.${t} enable row level security`);
      expect(sql).toMatch(new RegExp(`create policy "${t}_own" on public\\.${t}[\\s\\S]*?using \\(\\(select auth\\.uid\\(\\)\\) = user_id\\)[\\s\\S]*?with check \\(\\(select auth\\.uid\\(\\)\\) = user_id\\)`));
      expect(sql).toMatch(new RegExp(`${t} \\([\\s\\S]*?user_id uuid not null default auth\\.uid\\(\\) references auth\\.users \\(id\\) on delete cascade|${t} \\([\\s\\S]*?user_id uuid primary key default auth\\.uid\\(\\) references auth\\.users \\(id\\) on delete cascade`));
    }
    expect(sql).toMatch(/revoke all on public\.offrou_completions, public\.offrou_saved, public\.offrou_feedback, public\.offrou_taste from anon/);
  });

  it('계정 삭제 함수는 본인만, 안전한 search_path로', () => {
    expect(sql).toMatch(/security definer\s+set search_path = ''/);
    expect(sql).toContain('delete from auth.users where id = auth.uid()');
    expect(sql).toMatch(/revoke all on function public\.delete_my_account\(\) from public, anon/);
  });

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f: string) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });

  it('프런트 코드에 비밀 키·토큰이 없다', () => {
    const files = walk(join(root, 'src')).filter((f) => /\.(ts|tsx|css)$/.test(f));
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      expect(text, f).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/); // JWT
      expect(text, f).not.toMatch(/sb_secret_[A-Za-z0-9]/);
      expect(text, f).not.toMatch(/SERVICE_ROLE_KEY\s*[=:]/);
      expect(text, f).not.toMatch(/import\.meta\.env\.\w*(SERVICE|SECRET)/);
    }
  });

  it('.env는 Git에서 빠지고, 예시 파일에는 값이 없다', () => {
    const ignore = readFileSync(join(root, '.gitignore'), 'utf8');
    expect(ignore).toMatch(/^\.env$/m);
    expect(ignore).toMatch(/^\.env\.\*$/m);
    const example = readFileSync(join(root, '.env.example'), 'utf8');
    const vars = example.split('\n').filter((l) => /^[A-Z_]+=/.test(l));
    expect(vars).toEqual(['VITE_SUPABASE_URL=', 'VITE_SUPABASE_ANON_KEY=', 'VITE_SITE_URL=', 'VITE_OG_IMAGE=', 'VITE_VAPID_PUBLIC_KEY=']);
  });
});
