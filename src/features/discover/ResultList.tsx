import { useState } from 'react';
import { ExperienceCard } from '@/components/experience/ExperienceCard';
import type { Experience } from '@/types/offrou';
import styles from './DiscoverPage.module.css';

/** 한 번에 몰아 보여주지 않고 조금씩 */
export const PAGE_SIZE = 8;

export function ResultList({ items }: { items: Experience[] }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const rest = items.length - limit;

  return (
    <>
      <ul className={styles.results} aria-label="경험 목록">
        {items.slice(0, limit).map((e) => (
          <li key={e.id}>
            <ExperienceCard experience={e} />
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <button type="button" className={styles.more} onClick={() => setLimit((n) => n + PAGE_SIZE)}>
          더 보기 <span className={styles.moreCount}>{rest}개 더</span>
        </button>
      )}
    </>
  );
}
