import { APP_VERSION } from '@/app/version';
import { STORAGE_KEYS, isObject, readJson, writeJson } from './storage';

/**
 * 화면 오류 기록 (이 기기에만, 최근 5개).
 * 오류 종류·코드·버전·경로·시각만 남긴다 — 입력한 글·기록·인증 정보는 담지 않는다.
 * 사용자가 문의할 때 오류 코드를 함께 보낼 수 있다. (외부 오류 추적 서비스로 보내지 않는다)
 */
export interface AppErrorEntry {
  code: string;
  name: string;
  appVersion: string;
  route: string;
  at: string;
}

const LIMIT = 5;

const isEntry = (v: unknown): v is AppErrorEntry => isObject(v) && typeof v.code === 'string';

export const getErrorLog = () => readJson<unknown[]>(STORAGE_KEYS.errorLog, [], Array.isArray).filter(isEntry);

/** 짧은 오류 코드 (같은 종류·경로면 같은 코드) */
export function errorCode(name: string, route: string): string {
  let h = 0;
  for (const ch of `${name}|${route.replace(/\/[^/]*\d[^/]*/g, '/:id')}`) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return `E-${h.toString(36).toUpperCase().slice(0, 6)}`;
}

export const errorName = (error: unknown) =>
  error && typeof error === 'object' && 'status' in error
    ? `Route${String((error as { status: unknown }).status)}`
    : error instanceof Error
      ? error.name
      : 'Unknown';

/** 오류 코드를 만들고 이 기기의 오류 기록에 남긴다 */
export function noteAppError(error: unknown, route: string): string {
  const name = errorName(error);
  const code = errorCode(name, route);
  try {
    const entry: AppErrorEntry = { code, name, appVersion: APP_VERSION, route, at: new Date().toISOString() };
    writeJson(STORAGE_KEYS.errorLog, [entry, ...getErrorLog().filter((e) => e.code !== code)].slice(0, LIMIT));
  } catch {
    // 무시
  }
  return code;
}
