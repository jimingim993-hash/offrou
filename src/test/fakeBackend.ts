import { AccountError } from '@/services/account/errors';
import {
  fromCompletionRow,
  fromCourseRunRow,
  fromFeedbackRow,
  fromSavedCourseRow,
  fromSavedRow,
  pushToRows,
  type CompletionRow,
  type CourseRunRow,
  type FeedbackRow,
  type SavedCourseRow,
  type SavedRow,
  type TasteRow,
} from '@/services/account/supabaseRows';
import type { AccountBackend, AuthEvent, AuthUser, PushSubscriptionInput } from '@/services/account/types';
import { EMPTY_SNAPSHOT, type UserSnapshot } from '@/services/sync/snapshot';

/**
 * 테스트용 메모리 백엔드. Supabase 대신 같은 인터페이스를 흉내 낸다.
 * - FakeServer 하나를 여러 "기기"(createDevice)가 공유한다.
 * - 세션은 localStorage에 둔다 → 새로고침(재마운트) 복원, 다른 기기(로컬 초기화) 시나리오를 재현.
 * - 데이터 접근은 항상 세션 사용자 기준이고, 행의 user_id가 세션과 다르면 거부한다 (RLS 흉내).
 * - online=false면 모든 요청이 네트워크 오류로 실패한다.
 */
interface FakeUser {
  id: string;
  email: string;
  password: string;
  confirmed: boolean;
}

interface UserTables {
  completions: Map<string, CompletionRow>;
  saved: Map<string, SavedRow>;
  feedback: Map<string, FeedbackRow>;
  taste: TasteRow | null;
  courseRuns: Map<string, CourseRunRow>;
  savedCourses: Map<string, SavedCourseRow>;
}

const SESSION_KEY = 'fake-auth-session';

export class FakeServer {
  users = new Map<string, FakeUser>();
  tables = new Map<string, UserTables>();
  online = true;
  requireEmailConfirm = false;
  resetEmails: string[] = [];
  /** 알림 구독 (endpoint → 사용자·설정). 같은 endpoint는 한 계정에만 */
  pushSubs = new Map<string, PushSubscriptionInput & { userId: string }>();
  /** false면 알림 저장소가 없는 서버 (구버전·마이그레이션 전) */
  pushEnabled = true;
  private seq = 0;

  tablesFor(userId: string): UserTables {
    let t = this.tables.get(userId);
    if (!t) {
      t = { completions: new Map(), saved: new Map(), feedback: new Map(), taste: null, courseRuns: new Map(), savedCourses: new Map() };
      this.tables.set(userId, t);
    }
    return t;
  }

  /** 테스트 확인용: 서버에 저장된 사용자 데이터 */
  snapshotOf(userId: string): UserSnapshot {
    const t = this.tablesFor(userId);
    return {
      records: [...t.completions.values()].map(fromCompletionRow),
      saved: [...t.saved.values()].map(fromSavedRow),
      feedback: [...t.feedback.values()].map(fromFeedbackRow),
      activity: { ...EMPTY_SNAPSHOT.activity, ...(t.taste?.data ?? {}) },
      courseRuns: [...t.courseRuns.values()].map(fromCourseRunRow),
      savedCourses: [...t.savedCourses.values()].map(fromSavedCourseRow),
    };
  }

  userId(email: string) {
    return this.users.get(email)?.id;
  }

  newId() {
    return `user-${++this.seq}`;
  }

  createDevice(): AccountBackend & { server: FakeServer } {
    return createFakeDevice(this);
  }
}

function createFakeDevice(server: FakeServer): AccountBackend & { server: FakeServer } {
  const pushStore: AccountBackend['push'] = {
    async save(sub) {
      net();
      const user = requireSession();
      server.pushSubs.set(sub.endpoint, { ...sub, userId: user.id });
    },
    async remove(endpoint) {
      net();
      const user = requireSession();
      if (server.pushSubs.get(endpoint)?.userId === user.id) server.pushSubs.delete(endpoint);
    },
  };

  const listeners = new Set<(u: AuthUser | null, e: AuthEvent) => void>();

  const readSession = (): AuthUser | null => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const user = raw ? (JSON.parse(raw) as AuthUser) : null;
      // 서버에서 지워진 계정의 세션은 무효
      return user && [...server.users.values()].some((u) => u.id === user.id) ? user : null;
    } catch {
      return null;
    }
  };

  const setSession = (user: AuthUser | null, event: AuthEvent) => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
    for (const l of listeners) setTimeout(() => l(user, event), 0);
  };

  const net = () => {
    if (!server.online) throw new AccountError('network', new TypeError('Failed to fetch'));
  };

  const requireSession = () => {
    const user = readSession();
    if (!user) throw new AccountError('session_expired');
    return user;
  };

  return {
    server,

    get push() {
      return server.pushEnabled ? pushStore : undefined;
    },

    async getUser() {
      return readSession();
    },

    onAuthChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async signUp(email, password) {
      net();
      const key = email.trim().toLowerCase();
      if (password.length < 6) throw new AccountError('weak_password');
      if (server.users.has(key)) throw new AccountError('email_taken');
      const user: FakeUser = { id: server.newId(), email: key, password, confirmed: !server.requireEmailConfirm };
      server.users.set(key, user);
      if (server.requireEmailConfirm) return { user: { id: user.id, email: key }, needsEmailConfirm: true };
      const auth = { id: user.id, email: key };
      setSession(auth, 'signed_in');
      return { user: auth, needsEmailConfirm: false };
    },

    async signIn(email, password) {
      net();
      const user = server.users.get(email.trim().toLowerCase());
      if (!user || user.password !== password) throw new AccountError('invalid_credentials');
      if (!user.confirmed) throw new AccountError('email_not_confirmed');
      const auth = { id: user.id, email: user.email };
      setSession(auth, 'signed_in');
      return auth;
    },

    async signOut() {
      setSession(null, 'signed_out');
    },

    async requestPasswordReset(email) {
      net();
      server.resetEmails.push(email.trim().toLowerCase());
    },

    async updatePassword(password) {
      net();
      const session = requireSession();
      const user = [...server.users.values()].find((u) => u.id === session.id)!;
      user.password = password;
    },

    async deleteAccount() {
      net();
      const session = requireSession();
      for (const [email, u] of server.users) if (u.id === session.id) server.users.delete(email);
      server.tables.delete(session.id); // on delete cascade
      for (const [endpoint, sub] of server.pushSubs) if (sub.userId === session.id) server.pushSubs.delete(endpoint);
      setSession(null, 'signed_out');
    },

    remote: {
      async pull() {
        net();
        const user = requireSession();
        return server.snapshotOf(user.id);
      },

      async push(changes) {
        net();
        const user = requireSession();
        const rows = pushToRows(user.id, changes);
        const t = server.tablesFor(user.id);
        const own = (r: { user_id: string }) => {
          if (r.user_id !== user.id) throw new AccountError('unknown', new Error('RLS: user_id mismatch'));
        };
        for (const r of rows.completions) {
          own(r);
          if (!t.completions.has(r.id)) t.completions.set(r.id, r); // ignoreDuplicates
        }
        for (const r of rows.saved) {
          own(r);
          t.saved.set(r.experience_id, r);
        }
        for (const r of rows.feedback) {
          own(r);
          t.feedback.set(r.record_id, r);
        }
        if (rows.taste) {
          own(rows.taste);
          t.taste = rows.taste;
        }
        for (const r of rows.courseRuns) {
          own(r);
          t.courseRuns.set(r.id, r);
        }
        for (const r of rows.savedCourses) {
          own(r);
          t.savedCourses.set(r.id, r);
        }
      },
    },
  };
}
