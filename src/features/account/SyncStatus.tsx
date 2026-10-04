import { useAccount } from './AccountProvider';
import styles from './account.module.css';

const time = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** 동기화 상태를 아주 작게. 기술 용어는 쓰지 않는다. */
export function SyncStatus() {
  const { sync, lastSyncedAt } = useAccount();
  const text =
    sync === 'syncing'
      ? '이어가는 중…'
      : sync === 'offline' || sync === 'error'
        ? '기록은 이 기기에 안전하게 남아 있어. 연결되면 다시 이어갈게.'
        : lastSyncedAt
          ? `동기화됨 · ${time(lastSyncedAt)}`
          : '';
  if (!text) return null;
  return (
    <p className={`${styles.sync} ${sync === 'offline' || sync === 'error' ? styles.syncWarn : ''}`} role="status">
      {text}
    </p>
  );
}
