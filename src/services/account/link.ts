import { STORAGE_KEYS, isObject, readJson, resetAllData, writeJson } from '../storage';
import { readLocalSnapshot, type UserSnapshot } from '../sync/snapshot';
import type { AuthUser } from './types';

/**
 * 이 기기의 OFFROU 기록이 어느 계정과 이어져 있는지.
 * - 없음: 비회원 기록 (로그인하면 "이어갈까?"를 묻는다)
 * - 있음: 그 계정의 기록 사본 (같은 계정으로 로그인하면 바로 동기화)
 * 이메일 외의 계정 정보는 저장하지 않는다. 토큰은 인증 SDK가 따로 관리한다.
 */
export interface AccountLink {
  userId: string;
  email: string;
  linkedAt: string;
  lastSyncedAt?: string;
}

const isLink = (v: unknown): v is AccountLink =>
  isObject(v) && typeof v.userId === 'string' && typeof v.email === 'string' && typeof v.linkedAt === 'string';

export const getLink = () => readJson<AccountLink | null>(STORAGE_KEYS.account, null, isLink);

export const setLink = (user: AuthUser, now = new Date()) =>
  writeJson(STORAGE_KEYS.account, { userId: user.id, email: user.email, linkedAt: now.toISOString() } satisfies AccountLink);

export function markSynced(at: string) {
  const link = getLink();
  if (link) writeJson(STORAGE_KEYS.account, { ...link, lastSyncedAt: at });
}

export function clearLink() {
  try {
    localStorage.removeItem(STORAGE_KEYS.account);
  } catch {
    // 무시
  }
}

interface GuestBackup {
  savedAt: string;
  /** 어느 계정의 사본이었는지 (비회원 기록이면 없음) */
  fromUserId?: string;
  snapshot: UserSnapshot;
}

/**
 * 지금 기기 기록을 따로 보관한다 (새로 시작하기, 다른 계정 로그인 시).
 * 자동으로 지우지 않는다 → 의도치 않은 데이터 손실 방지. "이 기기의 기록 초기화"로만 지워진다.
 */
export function backupLocalData(fromUserId?: string, now = new Date()) {
  // 이전 보관본이 있으면 덮어쓰지 않고 보관 목록으로 옮긴다
  const previous = getBackup();
  if (previous) {
    const archive = readJson<unknown[]>(STORAGE_KEYS.guestBackupArchive, [], Array.isArray);
    writeJson(STORAGE_KEYS.guestBackupArchive, [...archive, previous].slice(-10));
  }
  writeJson(STORAGE_KEYS.guestBackup, {
    savedAt: now.toISOString(),
    fromUserId,
    snapshot: readLocalSnapshot(),
  } satisfies GuestBackup);
}

export const getBackup = () =>
  readJson<GuestBackup | null>(STORAGE_KEYS.guestBackup, null, (v) => isObject(v) && isObject(v.snapshot));

/** 사용자 기록만 비운다 (계정 연결·보관본·알림 설정·복구 보관함은 남김). 항상 backupLocalData 뒤에 부른다. */
export const clearUserData = () =>
  resetAllData({
    keep: [STORAGE_KEYS.account, STORAGE_KEYS.guestBackup, STORAGE_KEYS.guestBackupArchive, STORAGE_KEYS.notify, STORAGE_KEYS.recovery],
  });
