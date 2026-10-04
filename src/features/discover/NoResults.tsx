import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ExperienceCard } from '@/components/experience/ExperienceCard';
import { suggestAlternatives, type DiscoverFilter } from '@/services/discovery';
import styles from './DiscoverPage.module.css';

/** 결과 없음. 결과인 척하지 않고, 분명히 "대신"으로 구분해서 제안한다. */
export function NoResults({ filter, onClear }: { filter: DiscoverFilter; onClear: () => void }) {
  const [suggestions] = useState(() => suggestAlternatives(filter));

  return (
    <section className={styles.empty} aria-labelledby="no-results-title">
      <div className={styles.emptyHead}>
        <p className={styles.emptySymbol} aria-hidden="true">
          🌙
        </p>
        <h2 id="no-results-title" className={styles.emptyTitle}>
          그런 시간은 아직 준비하지 못했어.
        </h2>
        <Button variant="ghost" onClick={onClear}>
          검색·필터 지우기
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className={styles.suggest}>
          <h3 className={styles.sectionTitle}>대신 이런 건 어때?</h3>
          <ul className={styles.results} aria-label="대신 제안하는 시간">
            {suggestions.map((e) => (
              <li key={e.id}>
                <ExperienceCard experience={e} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
