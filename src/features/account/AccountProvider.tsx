import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { isBackendConfigured, loadBackend } from '@/services/account/backend';
import { AccountError, isNetworkError } from '@/services/account/errors';
import { backupLocalData, clearLink, clearUserData, getLink, markSynced, setLink } from '@/services/account/link';
import type { AccountBackend, AuthEvent, AuthUser, PushStore, SignUpResult } from '@/services/account/types';
import { getVersion, resetAllData, subscribe } from '@/services/storage';
import { syncWithRemote } from '@/services/sync/engine';
import { hasMeaningfulData, readLocalSnapshot } from '@/services/sync/snapshot';
import { disableNotifications, getNotifySettings } from '@/pwa/notifications';

/**
 * 계정 상태. 로그인은 선택 기능이고, 어떤 상태에서도 OFFROU 자체는 계속 쓸 수 있다.
 * - unavailable: 백엔드 설정이 없음 (계정 기능만 꺼짐)
 * - loading: 세션 확인 중
 * - guest: 비회원 (기록은 이 기기에만)
 * - signedIn: 로그인 (기록은 이 기기에 먼저 저장되고 계정과 동기화)
 */
export type AccountStatus = 'unavailable' | 'loading' | 'guest' | 'signedIn';
export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
export type AccountNotice = 'continued' | 'fresh' | 'signed_out' | 'deleted' | 'password_updated' | null;

interface AccountContextValue {
  status: AccountStatus;
  user: AuthUser | null;
  sync: SyncState;
  lastSyncedAt?: string;
  /** 로그인했는데 이 기기에 비회원 기록이 있어 "이어갈까?"를 기다리는 중 */
  pendingLink: boolean;
  /** 비밀번호 재설정 링크로 들어온 상태 */
  recovering: boolean;
  notice: AccountNotice;
  /** 알림 구독 저장소 (로그인 + 서버 준비 시에만) */
  pushStore: PushStore | null;
  clearNotice(): void;
  signUp(email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<void>;
  /** clearLocal: 이 기기에 남은 기록도 지운다 (계정 데이터는 그대로) */
  signOut(options?: { clearLocal?: boolean }): Promise<void>;
  resolveLink(choice: 'continue' | 'fresh'): Promise<void>;
  syncNow(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  deleteAccount(): Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

const AUTO_SYNC_DELAY = 1200;

export function AccountProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<AccountBackend | null>(null);
  const [status, setStatus] = useState<AccountStatus>(() => (isBackendConfigured() ? 'loading' : 'unavailable'));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sync, setSync] = useState<SyncState>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(() => getLink()?.lastSyncedAt);
  const [pendingLink, setPendingLink] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [notice, setNotice] = useState<AccountNotice>(null);

  const syncing = useRef<Promise<void> | null>(null);
  /** 마지막으로 서버와 맞춘 시점의 로컬 저장소 버전 */
  const syncedVersion = useRef(-1);

  const runSync = useCallback((b: AccountBackend): Promise<void> => {
    if (syncing.current) return syncing.current;
    const task = (async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setSync('offline');
        return;
      }
      setSync('syncing');
      try {
        await syncWithRemote(b.remote);
        const at = new Date().toISOString();
        markSynced(at);
        syncedVersion.current = getVersion();
        setLastSyncedAt(at);
        setSync('synced');
      } catch (e) {
        // 기록은 이 기기에 그대로 남아 있다. 연결되면 다시 시도한다.
        if (import.meta.env.DEV && !isNetworkError(e)) console.warn('[OFFROU sync]', e);
        setSync(isNetworkError(e) ? 'offline' : 'error');
        if (e instanceof AccountError && e.code === 'session_expired') {
          setUser(null);
          setStatus('guest');
        }
      }
    })().finally(() => {
      syncing.current = null;
    });
    syncing.current = task;
    return task;
  }, []);

  /** 로그인한 사용자가 정해졌을 때: 이 기기 기록을 어떻게 이어갈지 결정 */
  const applyUser = useCallback(
    (b: AccountBackend, next: AuthUser | null, event?: AuthEvent) => {
      if (event === 'password_recovery') setRecovering(true);
      if (!next) {
        setUser(null);
        setStatus('guest');
        setPendingLink(false);
        setSync('idle');
        return;
      }
      setUser(next);
      setStatus('signedIn');
      const link = getLink();
      if (link?.userId === next.id) {
        setPendingLink(false);
        void runSync(b);
        return;
      }
      if (link && link.userId !== next.id) {
        // 다른 계정의 사본이 남아 있다 → 섞지 않고 따로 보관한 뒤 새 계정 기록을 받는다
        backupLocalData(link.userId);
        clearUserData();
        setLink(next);
        setPendingLink(false);
        void runSync(b);
        return;
      }
      if (hasMeaningfulData(readLocalSnapshot())) {
        setPendingLink(true); // "이 기기의 OFFROU 기록을 계정에 이어갈까?"
        return;
      }
      setLink(next);
      setPendingLink(false);
      void runSync(b);
    },
    [runSync],
  );

  // 백엔드 불러오기 + 세션 복원
  useEffect(() => {
    if (!isBackendConfigured()) return;
    let alive = true;
    let unsubscribe = () => {};
    void loadBackend().then(async (b) => {
      if (!alive) return;
      if (!b) {
        setStatus('unavailable');
        return;
      }
      setBackend(b);
      const restored = await b.getUser().catch(() => null);
      if (!alive) return;
      applyUser(b, restored);
      unsubscribe = b.onAuthChange((u, event) => {
        if (alive) applyUser(b, u, event);
      });
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [applyUser]);

  // 로그인 중이면: 이 기기 기록이 바뀔 때마다(잠시 모아서) 동기화, 다시 연결되면 동기화
  useEffect(() => {
    if (!backend || status !== 'signedIn' || pendingLink) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribe(() => {
      if (syncing.current || getVersion() <= syncedVersion.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => void runSync(backend), AUTO_SYNC_DELAY);
    });
    const online = () => void runSync(backend);
    window.addEventListener('online', online);
    return () => {
      unsubscribe();
      clearTimeout(timer);
      window.removeEventListener('online', online);
    };
  }, [backend, status, pendingLink, runSync]);

  const requireBackend = useCallback(() => {
    if (!backend) throw new AccountError('unknown');
    return backend;
  }, [backend]);

  const value = useMemo<AccountContextValue>(
    () => ({
      status,
      user,
      sync,
      lastSyncedAt,
      pendingLink,
      recovering,
      notice,
      pushStore: status === 'signedIn' ? (backend?.push ?? null) : null,
      clearNotice: () => setNotice(null),

      async signUp(email, password) {
        const b = requireBackend();
        const result = await b.signUp(email, password);
        if (result.user && !result.needsEmailConfirm) applyUser(b, result.user, 'signed_in');
        return result;
      },

      async signIn(email, password) {
        const b = requireBackend();
        applyUser(b, await b.signIn(email, password), 'signed_in');
      },

      async signOut({ clearLocal = false } = {}) {
        const b = requireBackend();
        // 나가기 전에 한 번 더 올려둔다
        if (status === 'signedIn' && !pendingLink) await runSync(b);
        const unsynced = getVersion() > syncedVersion.current;
        if (clearLocal && unsynced && !pendingLink) throw new AccountError('network');
        // 로그아웃한 기기로 계정 알림이 계속 오지 않게 이 기기의 알림을 끈다
        if (getNotifySettings().enabled) await disableNotifications({ store: b.push });
        await b.signOut();
        if (clearLocal) resetAllData();
        applyUser(b, null, 'signed_out');
        setNotice('signed_out');
      },

      async resolveLink(choice) {
        const b = requireBackend();
        if (!user) return;
        if (choice === 'fresh') {
          // 비회원 기록은 지우지 않고 따로 보관 (계정에는 올리지 않는다)
          backupLocalData();
          clearUserData();
        }
        setLink(user);
        setPendingLink(false);
        setNotice(choice === 'continue' ? 'continued' : 'fresh');
        await runSync(b);
      },

      syncNow: async () => {
        if (backend && status === 'signedIn' && !pendingLink) await runSync(backend);
      },

      async requestPasswordReset(email) {
        await requireBackend().requestPasswordReset(email);
      },

      async updatePassword(password) {
        await requireBackend().updatePassword(password);
        setRecovering(false);
        setNotice('password_updated');
      },

      async deleteAccount() {
        const b = requireBackend();
        await b.deleteAccount();
        // 서버 구독은 계정과 함께 지워졌다. 이 기기의 알림 설정·구독도 끈다
        if (getNotifySettings().enabled) await disableNotifications();
        // 이 기기에 남은 기록은 비회원 기록으로 남는다 (따로 "이 기기의 기록 초기화"로 지울 수 있음)
        clearLink();
        applyUser(b, null, 'signed_out');
        setNotice('deleted');
      },
    }),
    [status, user, sync, lastSyncedAt, pendingLink, recovering, notice, backend, requireBackend, applyUser, runSync],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('AccountProvider가 필요해');
  return ctx;
}
