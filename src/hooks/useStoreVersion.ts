import { useSyncExternalStore } from 'react';
import { getVersion, subscribe } from '@/services/storage';

/** 로컬 저장소가 바뀔 때마다 바뀌는 값. 화면이 저장 데이터를 다시 읽도록 의존성으로 쓴다. */
export const useStoreVersion = () => useSyncExternalStore(subscribe, getVersion, getVersion);
