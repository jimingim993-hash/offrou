import { Link } from 'react-router-dom';
import { useStoreVersion } from '@/hooks/useStoreVersion';
import { getRecentViewed } from '@/services/activity';
import { getExperience } from '@/services/experiences';
import { experiencePath } from '@/features/experience/paths';
import styles from './DiscoverPage.module.css';

/** 최근 본 시간: 상세를 열어봤지만 아직 시작하지 않은 경험 (최대 5개) */
export function RecentViewed() {
  useStoreVersion();
  const items = getRecentViewed()
    .map((id) => getExperience(id))
    .filter((e) => e !== undefined);
  if (items.length === 0) return null;

  return (
    <section className={styles.recent} aria-labelledby="recent-title">
      <h2 id="recent-title" className={styles.sectionTitle}>
        최근 본 시간
      </h2>
      <ul className={styles.recentList}>
        {items.map((e) => (
          <li key={e.id}>
            <Link to={experiencePath(e.id)} className={styles.recentItem}>
              <span aria-hidden="true">{e.symbol ?? '·'}</span> {e.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
