import { createClient, type AuthError as SupabaseAuthError, type SupabaseClient, type User } from '@supabase/supabase-js';
import { AccountError, isNetworkError, type AccountErrorCode } from './errors';
import {
  TABLES,
  pushToRows,
  rowsToSnapshot,
  type CompletionRow,
  type CourseRunRow,
  type FeedbackRow,
  type SavedCourseRow,
  type SavedRow,
  type TasteRow,
} from './supabaseRows';
import type { AccountBackend, AuthEvent, AuthUser } from './types';
import type { AdminSupportRequest, SupportHistory, SupportNote } from '../support/types';

/**
 * Supabase 구현.
 * - 공개(anon) 키만 쓴다. 관리자(service_role) 키는 프런트에 두지 않는다.
 * - 데이터 접근은 RLS로 "자기 행만" 허용된다 (supabase/migrations 참고).
 * - 계정 삭제는 서버 함수 delete_my_account() (security definer)로 처리한다.
 */

const toUser = (u: User | null | undefined): AuthUser | null => (u ? { id: u.id, email: u.email ?? '' } : null);

const AUTH_CODES: Record<string, AccountErrorCode> = {
  invalid_credentials: 'invalid_credentials',
  user_already_exists: 'email_taken',
  email_exists: 'email_taken',
  weak_password: 'weak_password',
  email_address_invalid: 'invalid_email',
  validation_failed: 'invalid_email',
  email_not_confirmed: 'email_not_confirmed',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
  session_not_found: 'session_expired',
  session_expired: 'session_expired',
  refresh_token_not_found: 'session_expired',
};

export function mapSupabaseError(error: unknown): AccountError {
  if (error instanceof AccountError) return error;
  if (isNetworkError(error)) return new AccountError('network', error);
  const code = (error as SupabaseAuthError | null)?.code;
  const status = (error as SupabaseAuthError | null)?.status;
  if (code && AUTH_CODES[code]) return new AccountError(AUTH_CODES[code], error);
  if (status === 429) return new AccountError('rate_limited', error);
  if (status === 401 || status === 403) return new AccountError('session_expired', error);
  return new AccountError('unknown', error);
}

const fail = (error: unknown): never => {
  throw mapSupabaseError(error);
};

const redirect = (path: string) => (typeof window !== 'undefined' ? `${window.location.origin}${path}` : undefined);

export function createSupabaseBackend(url: string, anonKey: string): AccountBackend {
  const supabase: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const requireUserId = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new AccountError('session_expired', error ?? undefined);
    return data.session.user.id;
  };

  return {
    async getUser() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) return null;
        return toUser(data.session?.user);
      } catch {
        return null; // 세션이 깨져도 앱은 비회원으로 계속
      }
    },

    onAuthChange(listener) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        const mapped: AuthEvent =
          event === 'SIGNED_OUT'
            ? 'signed_out'
            : event === 'PASSWORD_RECOVERY'
              ? 'password_recovery'
              : event === 'SIGNED_IN'
                ? 'signed_in'
                : 'other';
        // SDK 콜백 안에서 다른 SDK 호출을 기다리면 교착될 수 있어 다음 틱으로 넘긴다
        setTimeout(() => listener(toUser(session?.user), mapped), 0);
      });
      return () => data.subscription.unsubscribe();
    },

    async signUp(email, password) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirect('/app/account') },
      });
      if (error) fail(error);
      // 이미 가입된 이메일이면 Supabase가 빈 identities로 응답하는 경우가 있다
      if (data.user && data.user.identities?.length === 0) throw new AccountError('email_taken');
      return { user: toUser(data.session?.user ?? data.user), needsEmailConfirm: !data.session };
    },

    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) fail(error);
      return toUser(data.user)!;
    },

    async signOut() {
      // 이 기기의 세션만 끝낸다
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error && !isNetworkError(error)) fail(error);
    },

    async requestPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect('/app/account/reset') });
      if (error) fail(error);
    },

    async updatePassword(password) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) fail(error);
    },

    async deleteAccount() {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) fail(error);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    },

    remote: {
      async pull() {
        await requireUserId();
        // RLS가 자기 행만 돌려준다
        const [c, s, f, t, cr, sc] = await Promise.all([
          supabase.from(TABLES.completions).select('*'),
          supabase.from(TABLES.saved).select('*'),
          supabase.from(TABLES.feedback).select('*'),
          supabase.from(TABLES.taste).select('*').maybeSingle(),
          supabase.from(TABLES.courseRuns).select('*'),
          supabase.from(TABLES.savedCourses).select('*'),
        ]);
        for (const r of [c, s, f, t]) if (r.error) fail(r.error);
        // 코스 테이블(8단계 마이그레이션)이 아직 없으면 코스만 빼고 동기화한다 → 코스 기록은 이 기기에 남는다
        for (const r of [cr, sc]) if (r.error && !isMissingSchema(r.error)) fail(r.error);
        if ([cr, sc].some((r) => r.error)) warnMissingSchema();
        return rowsToSnapshot({
          completions: (c.data ?? []) as CompletionRow[],
          saved: (s.data ?? []) as SavedRow[],
          feedback: (f.data ?? []) as FeedbackRow[],
          taste: (t.data ?? null) as TasteRow | null,
          courseRuns: (cr.data ?? []) as CourseRunRow[],
          savedCourses: (sc.data ?? []) as SavedCourseRow[],
        });
      },

      async push(changes) {
        const userId = await requireUserId();
        const rows = pushToRows(userId, changes);
        const upsertCompletions = async () => {
          const opts = { onConflict: 'user_id,id', ignoreDuplicates: true };
          let completions: Record<string, unknown>[] = rows.completions.map((r) => ({ ...r }));
          let result = await supabase.from(TABLES.completions).upsert(completions, opts);
          // 새 실행 방식(play·hobby)을 모르는 서버(10·11단계 마이그레이션 전) → 그 기록의 kind만 비워서 다시 올린다
          if (result.error && isKindRejected(result.error)) {
            warnMissingSchema();
            completions = completions.map((r) => (r.kind && !LEGACY_KINDS.includes(r.kind as string) ? { ...r, kind: null } : r));
            result = await supabase.from(TABLES.completions).upsert(completions, opts);
          }
          if (!result.error || !isMissingSchema(result.error)) return result;
          // course_run_id 열이 아직 없는 서버(8단계 마이그레이션 전) → 그 열만 빼고 다시 올린다
          warnMissingSchema();
          const legacy = completions.map(({ course_run_id: _omit, ...rest }) => rest);
          return supabase.from(TABLES.completions).upsert(legacy, opts);
        };
        const required = [];
        if (rows.completions.length) required.push(upsertCompletions());
        if (rows.saved.length) required.push(supabase.from(TABLES.saved).upsert(rows.saved, { onConflict: 'user_id,experience_id' }));
        if (rows.feedback.length) required.push(supabase.from(TABLES.feedback).upsert(rows.feedback, { onConflict: 'user_id,record_id' }));
        if (rows.taste) required.push(supabase.from(TABLES.taste).upsert(rows.taste, { onConflict: 'user_id' }));
        const courses = [];
        if (rows.courseRuns.length) courses.push(supabase.from(TABLES.courseRuns).upsert(rows.courseRuns, { onConflict: 'user_id,id' }));
        if (rows.savedCourses.length) courses.push(supabase.from(TABLES.savedCourses).upsert(rows.savedCourses, { onConflict: 'user_id,id' }));
        const [requiredResults, courseResults] = await Promise.all([Promise.all(required), Promise.all(courses)]);
        for (const r of requiredResults) if (r.error) fail(r.error);
        for (const r of courseResults) {
          if (!r.error) continue;
          if (isMissingSchema(r.error)) warnMissingSchema();
          else fail(r.error);
        }
      },
    },

    support: {
      async submit(input) {
        // 비회원(anon)도 부를 수 있는 서버 함수. 길이·종류 검사와 빈도 제한은 서버가 한다.
        const { data, error } = await supabase.rpc('submit_support_request', {
          p_type: input.type,
          p_title: input.title,
          p_message: input.message,
          p_email: input.email ?? null,
          p_info: input.info,
        });
        if (error) {
          if (/rate_limited/.test(error.message ?? '')) throw new AccountError('rate_limited', error);
          fail(error);
        }
        return { requestNumber: String(data) };
      },
      async listMine() {
        const userId = await requireUserId();
        // RLS가 자기 문의만 돌려준다 (운영자라도 여기서는 자기 것만 고른다)
        const { data, error } = await supabase
          .from(TABLES.supportRequests)
          .select('request_number, title, type, status, reply, created_at, updated_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) fail(error);
        return (data ?? []).map((r) => ({
          requestNumber: r.request_number,
          title: r.title,
          type: r.type,
          status: r.status,
          reply: r.reply,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      },
    },

    admin: {
      async isAdmin() {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) return false;
        const { data, error } = await supabase.rpc('is_offrou_admin');
        if (error) fail(error);
        return data === true;
      },
      async list(filter = {}) {
        await requireUserId();
        let q = supabase.from(TABLES.supportRequests).select('*').order('created_at', { ascending: false }).limit(500);
        if (filter.status) q = q.eq('status', filter.status);
        if (filter.type) q = q.eq('type', filter.type);
        if (filter.priority) q = q.eq('priority', filter.priority);
        const term = filter.q?.trim().replace(/[%,()]/g, '');
        if (term) q = q.or(`request_number.ilike.%${term}%,title.ilike.%${term}%`);
        const { data, error } = await q;
        if (error) fail(error);
        return (data ?? []) as AdminSupportRequest[];
      },
      async get(id) {
        await requireUserId();
        const { data, error } = await supabase.from(TABLES.supportRequests).select('*').eq('id', id).maybeSingle();
        if (error) fail(error);
        return (data ?? null) as AdminSupportRequest | null;
      },
      async update(id, patch) {
        await requireUserId();
        // RLS: 운영자만 수정된다. 운영자가 아니면 0행이 바뀌므로 오류로 알린다.
        const { data, error } = await supabase.from(TABLES.supportRequests).update(patch).eq('id', id).select('id');
        if (error) fail(error);
        if (!data?.length) throw new AccountError('session_expired');
      },
      async notes(id) {
        await requireUserId();
        const { data, error } = await supabase.from(TABLES.supportNotes).select('*').eq('request_id', id).order('created_at');
        if (error) fail(error);
        return (data ?? []) as SupportNote[];
      },
      async addNote(id, note) {
        const userId = await requireUserId();
        const { error } = await supabase.from(TABLES.supportNotes).insert({ request_id: id, admin_user_id: userId, note });
        if (error) fail(error);
      },
      async history(id) {
        await requireUserId();
        const { data, error } = await supabase.from(TABLES.supportHistory).select('*').eq('request_id', id).order('created_at');
        if (error) fail(error);
        return (data ?? []) as SupportHistory[];
      },
    },

    push: {
      async save(sub) {
        await requireUserId();
        // 같은 브라우저 구독이 다른 계정에 남아 있으면 서버 함수가 정리한 뒤 이 계정으로 저장한다
        const { error } = await supabase.rpc('save_push_subscription', {
          p_endpoint: sub.endpoint,
          p_p256dh: sub.p256dh,
          p_auth: sub.auth,
          p_time: sub.time,
          p_frequency: sub.frequency,
          p_timezone: sub.timezone,
        });
        if (error) fail(error);
      },

      async remove(endpoint) {
        await requireUserId();
        // RLS로 자기 구독만 지워진다
        const { error } = await supabase.from(TABLES.pushSubscriptions).delete().eq('endpoint', endpoint);
        if (error) fail(error);
      },
    },
  };
}

/** 마이그레이션이 아직 실행되지 않아 테이블·열이 없을 때의 오류 */
export function isMissingSchema(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code && ['42P01', 'PGRST205', '42703', 'PGRST204'].includes(e.code)) return true;
  return /relation .* does not exist|could not find the .*(table|column)/i.test(e.message ?? '');
}

/** 9단계까지의 서버가 아는 실행 방식 */
const LEGACY_KINDS = ['guide', 'rest', 'prompts', 'focus', 'story'];

/** 완료 기록의 kind 검사 제약(offrou_completions_kind_check) 위반 */
export function isKindRejected(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return !!e && e.code === '23514' && /kind_check/.test(e.message ?? '');
}

let warned = false;
const warnMissingSchema = () => {
  if (warned) return;
  warned = true;
  console.warn('[OFFROU] 서버 테이블이 최신이 아니야. supabase/migrations/ 의 마이그레이션을 이름 순서대로 실행해줘.');
};
