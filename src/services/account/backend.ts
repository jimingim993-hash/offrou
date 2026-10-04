import type { AccountBackend } from './types';

/**
 * 백엔드 연결.
 * - 환경변수가 없으면 null → 계정 기능만 꺼지고 비회원 OFFROU는 그대로 동작한다.
 * - Supabase SDK는 설정이 있을 때만 동적으로 불러온다 (비회원 첫 화면 번들에 넣지 않음).
 */
const env = import.meta.env;

let override: AccountBackend | null | undefined;
let loading: Promise<AccountBackend | null> | undefined;

export const isBackendConfigured = () =>
  override !== undefined ? override !== null : Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);

export function loadBackend(): Promise<AccountBackend | null> {
  if (override !== undefined) return Promise.resolve(override);
  if (!isBackendConfigured()) return Promise.resolve(null);
  loading ??= import('./supabaseBackend')
    .then((m) => m.createSupabaseBackend(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!))
    .catch((e: unknown) => {
      if (env.DEV) console.error('[OFFROU account] 백엔드를 불러오지 못했어', e);
      return null;
    });
  return loading;
}

/** 테스트에서 메모리 백엔드를 끼우거나(null이면 '미설정' 상태) 원래대로 되돌린다 */
export function setBackendForTesting(backend: AccountBackend | null | undefined) {
  override = backend;
  loading = undefined;
}
