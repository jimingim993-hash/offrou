import { Link } from 'react-router-dom';
import { CATEGORIES } from '@/data/categories';
import { formatMinutes } from '@/data/durations';
import { experiencePath } from '@/features/experience/paths';
import { getRecentExperiences } from '@/services/recent';
import styles from './MyPage.module.css';

/** MY "최근 본 시간" — 실제로 열어본 콘텐츠만, 최근 순. 지금 없는 콘텐츠는 보이지 않는다 (기록은 그대로). */
export function RecentViewed() {
  const items = getRecentExperiences();
  if (items.length === 0) return <p className={styles.recentEmpty}>아직 열어본 시간이 없어. 발견에서 둘러봐.</p>;
  return (
    <section className={styles.recent} aria-labelledby="recent-title">
      <h2 id="recent-title" className={styles.srOnly}>
        최근 본 시간
      </h2>
      <ul className={styles.recentList}>
        {items.map(({ experience: e }) => (
          <li key={e.id}>
            <Link to={experiencePath(e.id)} className={styles.recentCard}>
              <span className={styles.recentName}>{e.title}</span>
              <span className={styles.recentMeta}>{`${CATEGORIES.find((c) => c.id === e.categoryId)?.code ?? ''} · ${formatMinutes(e.minutes)}`}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
