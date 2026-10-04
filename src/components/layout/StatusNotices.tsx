import { useSyncExternalStore } from 'react';
import { applyUpdate, dismissUpdate, useUpdateAvailable } from '@/pwa/updates';
import styles from './StatusNotices.module.css';

const subscribeOnline = (l: () => void) => {
  window.addEventListener('online', l);
  window.addEventListener('offline', l);
  return () => {
    window.removeEventListener('online', l);
    window.removeEventListener('offline', l);
  };
};

export const useOnline = () =>
  useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine !== false,
    () => true,
  );

/** 오프라인일 때만 보이는 작은 안내. 저장된 OFFROU는 그대로 쓸 수 있다. */
export function OfflineNotice() {
  const online = useOnline();
  if (online) return null;
  return (
    <p className={styles.offline} role="status">
      지금은 오프라인이야. 저장된 OFFROU는 계속 사용할 수 있어.
    </p>
  );
}

/**
 * 새 버전 안내. 경험·코스를 진행하는 화면에서는 띄우지 않는다 (hidden).
 * "업데이트"를 눌러야만 새 버전으로 바뀐다.
 */
export function UpdateBanner({ hidden, withNav }: { hidden: boolean; withNav: boolean }) {
  const available = useUpdateAvailable();
  if (!available || hidden) return null;
  return (
    <div className={`${styles.update} ${withNav ? styles.aboveNav : ''}`} role="status">
      <p className={styles.updateText}>새로운 OFFROU가 준비됐어.</p>
      <div className={styles.updateButtons}>
        <button type="button" className={styles.later} onClick={dismissUpdate}>
          나중에
        </button>
        <button type="button" className={styles.apply} onClick={applyUpdate}>
          업데이트
        </button>
      </div>
    </div>
  );
}
