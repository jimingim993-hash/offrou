import { createSupabaseBackend, isMissingSchema } from '@/services/account/supabaseBackend';
import { EMPTY_SNAPSHOT } from '@/services/sync/snapshot';
import type { OffrouRecord } from '@/types/offrou';

/**
 * 서버에 8단계(코스) 마이그레이션이 아직 없을 때도 기존 동기화가 깨지지 않는지,
 * 알림 구독 저장이 서버 함수로 가는지 Supabase 클라이언트를 흉내 내 확인한다.
 */
type Result = { data: unknown; error: { code?: string; message?: string } | null };
const calls: { table: string; op: string; rows?: unknown; opts?: unknown }[] = [];
const rpcCalls: { fn: string; args: unknown }[] = [];
let tableResults: Record<string, Result> = {};
let upsertResults: ((table: string, rows: unknown) => Result) | null = null;

const ok = (data: unknown = []): Result => ({ data, error: null });

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'me@offrou.app' } } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    rpc: async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return { error: null };
    },
    from: (table: string) => {
      const select = () => {
        const r = tableResults[table] ?? ok(table === 'offrou_taste' ? null : []);
        return Object.assign(Promise.resolve(r), { maybeSingle: async () => r });
      };
      return {
        select,
        upsert: async (rows: unknown, opts: unknown) => {
          calls.push({ table, op: 'upsert', rows, opts });
          return upsertResults ? upsertResults(table, rows) : ok();
        },
        delete: () => ({
          eq: async (col: string, value: string) => {
            calls.push({ table, op: 'delete', rows: { [col]: value } });
            return ok();
          },
        }),
      };
    },
  }),
}));

const missingTable = { data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.offrou_course_runs'" } };
const missingColumn = { data: null, error: { code: 'PGRST204', message: "Could not find the 'course_run_id' column" } };

const record: OffrouRecord = {
  id: 'r1',
  experienceId: 'rest-window',
  categoryId: 'rest',
  title: '창밖 바라보기',
  minutes: 5,
  completedAt: '2026-10-04T10:00:00.000Z',
  courseRunId: 'run-1',
} as OffrouRecord;

beforeEach(() => {
  calls.length = 0;
  rpcCalls.length = 0;
  tableResults = {};
  upsertResults = null;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('마이그레이션 전 서버에서도 동기화가 이어진다', () => {
  it('코스 테이블이 없으면 코스만 빼고 받아온다', async () => {
    tableResults = { offrou_course_runs: missingTable, offrou_saved_courses: missingTable };
    const backend = createSupabaseBackend('https://x.supabase.co', 'anon');
    const snap = await backend.remote.pull();
    expect(snap.courseRuns).toEqual([]);
    expect(snap.savedCourses).toEqual([]);
  });

  it('다른 오류는 그대로 알린다 (조용히 삼키지 않는다)', async () => {
    tableResults = { offrou_saved: { data: null, error: { code: '42501', message: 'permission denied' } } };
    const backend = createSupabaseBackend('https://x.supabase.co', 'anon');
    await expect(backend.remote.pull()).rejects.toBeTruthy();
  });

  it('완료 기록에 course_run_id 열이 없으면 그 열만 빼고 다시 올린다', async () => {
    upsertResults = (table, rows) =>
      table === 'offrou_completions' && (rows as Record<string, unknown>[])[0] && 'course_run_id' in (rows as Record<string, unknown>[])[0]
        ? missingColumn
        : table === 'offrou_course_runs'
          ? missingTable
          : ok();
    const backend = createSupabaseBackend('https://x.supabase.co', 'anon');
    await backend.remote.push({
      ...EMPTY_SNAPSHOT,
      records: [record],
      saved: [],
      feedback: [],
      courseRuns: [
        { id: 'run-1', courseId: 'c1', title: '코스', vibe: 'calm', targetMinutes: 20, stepIds: ['rest-window'], completedIds: [], startedAt: '2026-10-04T10:00:00.000Z', updatedAt: '2026-10-04T10:00:00.000Z' },
      ],
    } as never);
    const completionUpserts = calls.filter((c) => c.table === 'offrou_completions');
    expect(completionUpserts).toHaveLength(2);
    expect((completionUpserts[1].rows as Record<string, unknown>[])[0]).not.toHaveProperty('course_run_id');
    expect((completionUpserts[1].rows as Record<string, unknown>[])[0]).toMatchObject({ id: 'r1', experience_id: 'rest-window' });
  });

  it("실행형 PLAY(kind 'play')를 모르는 서버 → 그 기록의 kind만 비워 다시 올린다 (10단계)", async () => {
    const kindError = { data: null, error: { code: '23514', message: 'new row violates check constraint "offrou_completions_kind_check"' } };
    upsertResults = (table, rows) =>
      table === 'offrou_completions' && (rows as Record<string, unknown>[]).some((r) => r.kind === 'play') ? kindError : ok();
    const backend = createSupabaseBackend('https://x.supabase.co', 'anon');
    await backend.remote.push({
      ...EMPTY_SNAPSHOT,
      records: [
        { ...record, id: 'p1', experienceId: 'play-three-words', categoryId: 'play', kind: 'play', courseRunId: undefined },
        { ...record, id: 'r2', kind: 'rest', courseRunId: undefined },
      ],
    } as never);
    const ups = calls.filter((c) => c.table === 'offrou_completions');
    expect(ups).toHaveLength(2);
    const retried = ups[1].rows as Record<string, unknown>[];
    expect(retried.find((r) => r.id === 'p1')!.kind).toBeNull();
    expect(retried.find((r) => r.id === 'r2')!.kind).toBe('rest');
  });

  it('없는 테이블·열 오류 판별', () => {
    expect(isMissingSchema(missingTable.error)).toBe(true);
    expect(isMissingSchema(missingColumn.error)).toBe(true);
    expect(isMissingSchema({ code: '42P01', message: 'relation "offrou_course_runs" does not exist' })).toBe(true);
    expect(isMissingSchema({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isMissingSchema(null)).toBe(false);
  });
});

describe('알림 구독 저장', () => {
  it('저장은 서버 함수(save_push_subscription), 해제는 자기 구독 삭제', async () => {
    const backend = createSupabaseBackend('https://x.supabase.co', 'anon');
    await backend.push!.save({ endpoint: 'https://push.example/a', p256dh: 'p', auth: 'a', time: '19:00', frequency: 'daily', timezone: 'Asia/Seoul' });
    expect(rpcCalls[0]).toEqual({
      fn: 'save_push_subscription',
      args: { p_endpoint: 'https://push.example/a', p_p256dh: 'p', p_auth: 'a', p_time: '19:00', p_frequency: 'daily', p_timezone: 'Asia/Seoul' },
    });
    await backend.push!.remove('https://push.example/a');
    expect(calls.at(-1)).toEqual({ table: 'offrou_push_subscriptions', op: 'delete', rows: { endpoint: 'https://push.example/a' } });
  });
});
