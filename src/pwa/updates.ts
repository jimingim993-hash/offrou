import { useSyncExternalStore } from 'react';

/**
 * 새 버전 알림 상태 (메모리에만).
 * "나중에"를 누르면 이번 실행 동안에는 다시 묻지 않는다. 다음에 앱을 열 때 새 버전이 자연스럽게 적용된다.
 */
interface UpdateState {
  ready: boolean;
  dismissed: boolean;
}

let state: UpdateState = { ready: false, dismissed: false };
let applier: (() => void) | null = null;
const listeners = new Set<() => void>();

const set = (next: Partial<UpdateState>) => {
  state = { ...state, ...next };
  for (const l of listeners) l();
};

export const markUpdateReady = () => {
  if (!state.ready) set({ ready: true });
};

export const dismissUpdate = () => set({ dismissed: true });

export const setUpdateApplier = (fn: (() => void) | null) => {
  applier = fn;
};

export const applyUpdate = () => {
  applier?.();
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const getUpdateState = () => state;

/** 배너를 보여줄지 */
export function useUpdateAvailable() {
  const s = useSyncExternalStore(subscribe, getUpdateState, getUpdateState);
  return s.ready && !s.dismissed;
}

export function resetUpdatesForTesting() {
  state = { ready: false, dismissed: false };
  applier = null;
  for (const l of listeners) l();
}
