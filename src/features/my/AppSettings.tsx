import { InstallCard } from './InstallCard';
import { NotificationSettings } from './NotificationSettings';
import styles from './AppSettings.module.css';

/** MY 아래쪽의 "앱과 알림" — 설치와 알림은 모두 여기서만, 사용자가 원할 때 */
export function AppSettings() {
  return (
    <section className={styles.section} aria-labelledby="app-settings-title">
      <h2 id="app-settings-title" className={styles.heading}>
        앱과 알림
      </h2>
      <InstallCard />
      <NotificationSettings />
    </section>
  );
}
