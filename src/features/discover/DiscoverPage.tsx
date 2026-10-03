import { Link } from 'react-router-dom';
import { CATEGORIES } from '@/data/categories';
import { PageHeader } from '@/components/ui/PageHeader';
import styles from './DiscoverPage.module.css';

export function DiscoverPage() {
  return (
    <>
      <PageHeader eyebrow="DISCOVER" title="어떤 시간을 둘러볼까?" />
      <ul className={styles.list}>
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link to={`/discover/${c.id}`} className={styles.card}>
              <span className={styles.symbol} aria-hidden="true">
                {c.symbol}
              </span>
              <span className={styles.text}>
                <span className={styles.code}>{c.code}</span>
                <span className={styles.name}>{c.name}</span>
                <span className={styles.tagline}>{c.tagline}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
