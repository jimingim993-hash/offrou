import { AccountError, isNetworkError } from '@/services/account/errors';
import { STORAGE_KEYS, isObject, readList, writeJson } from '@/services/storage';
import type { SupportStore, SupportSubmission } from '@/services/support/types';

/** 이 기기에서 보낸 문의 번호 (비회원도 나중에 번호를 다시 볼 수 있게, 최근 20개) */
export interface SentRequest {
  requestNumber: string;
  title: string;
  createdAt: string;
}

const isSent = (v: unknown): v is SentRequest => isObject(v) && typeof v.requestNumber === 'string' && typeof v.title === 'string';

export const getSentRequests = () => readList(STORAGE_KEYS.supportSent, isSent);

/** 연속 전송 방지 (화면 쪽 보조 장치일 뿐, 실제 제한은 서버가 한다) */
export const CLIENT_COOLDOWN_MS = 20_000;

export type SubmitOutcome =
  | { ok: true; requestNumber: string }
  | { ok: false; reason: 'offline' | 'unavailable' | 'rate_limited' | 'cooldown' | 'failed' };

export async function submitSupport(store: SupportStore | null, input: SupportSubmission, now = new Date()): Promise<SubmitOutcome> {
  if (!store) return { ok: false, reason: 'unavailable' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, reason: 'offline' };
  const last = getSentRequests()[0];
  if (last && now.getTime() - new Date(last.createdAt).getTime() < CLIENT_COOLDOWN_MS) return { ok: false, reason: 'cooldown' };
  try {
    const { requestNumber } = await store.submit(input);
    writeJson(STORAGE_KEYS.supportSent, [{ requestNumber, title: input.title, createdAt: now.toISOString() }, ...getSentRequests()].slice(0, 20));
    return { ok: true, requestNumber };
  } catch (e) {
    if (e instanceof AccountError && e.code === 'rate_limited') return { ok: false, reason: 'rate_limited' };
    if (isNetworkError(e)) return { ok: false, reason: 'offline' };
    return { ok: false, reason: 'failed' };
  }
}

export const SUBMIT_ERRORS: Record<Exclude<SubmitOutcome, { ok: true }>['reason'], string> = {
  offline: '인터넷에 연결된 뒤 다시 시도해줘. 작성한 내용은 그대로 있어.',
  unavailable: '지금은 문의를 받을 수 없어 (서버 연결 준비 중). 작성한 내용은 그대로 있어.',
  rate_limited: '짧은 시간에 너무 많이 보냈어. 잠시 후 다시 시도해줘.',
  cooldown: '방금 접수했어. 잠깐 뒤에 다시 보내줘.',
  failed: '지금 접수하지 못했어. 잠시 후 다시 시도해줘.',
};
