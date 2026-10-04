import { diffForPush, isEmptyPush, mergeSnapshots, type PushPayload } from './merge';
import { readLocalSnapshot, writeLocalSnapshot, type UserSnapshot } from './snapshot';

/**
 * 원격 저장소. 항상 "지금 로그인한 사용자"의 데이터만 다룬다.
 * 사용자 id를 인자로 받지 않는다 → 클라이언트가 다른 사용자를 지정할 방법 자체가 없다.
 * (실제 권한은 서버 RLS가 한 번 더 막는다.)
 */
export interface RemoteStore {
  pull(): Promise<UserSnapshot>;
  push(changes: PushPayload): Promise<void>;
}

/**
 * local-first 동기화 한 번.
 * 1) 서버 데이터를 받아 2) 이 기기 데이터와 병합해 3) 이 기기에 먼저 반영하고 4) 서버에 바뀐 것만 올린다.
 * 서버 요청이 실패하면 이 기기 데이터는 그대로 남는다 (1단계 실패 시 아무것도 바꾸지 않음).
 */
export async function syncWithRemote(remote: RemoteStore): Promise<UserSnapshot> {
  const server = await remote.pull();
  const merged = mergeSnapshots(readLocalSnapshot(), server);
  writeLocalSnapshot(merged);
  const changes = diffForPush(merged, server);
  if (!isEmptyPush(changes)) await remote.push(changes);
  return merged;
}
