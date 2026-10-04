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
        for (const r of [c, s, f, t, cr, sc]) if (r.error) fail(r.error);
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
        const ops = [];
        if (rows.completions.length)
          ops.push(supabase.from(TABLES.completions).upsert(rows.completions, { onConflict: 'user_id,id', ignoreDuplicates: true }));
        if (rows.saved.length) ops.push(supabase.from(TABLES.saved).upsert(rows.saved, { onConflict: 'user_id,experience_id' }));
        if (rows.feedback.length) ops.push(supabase.from(TABLES.feedback).upsert(rows.feedback, { onConflict: 'user_id,record_id' }));
        if (rows.taste) ops.push(supabase.from(TABLES.taste).upsert(rows.taste, { onConflict: 'user_id' }));
        if (rows.courseRuns.length) ops.push(supabase.from(TABLES.courseRuns).upsert(rows.courseRuns, { onConflict: 'user_id,id' }));
        if (rows.savedCourses.length) ops.push(supabase.from(TABLES.savedCourses).upsert(rows.savedCourses, { onConflict: 'user_id,id' }));
        for (const r of await Promise.all(ops)) if (r.error) fail(r.error);
      },
    },
  };
}
