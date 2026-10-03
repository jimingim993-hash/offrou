import { CATEGORIES } from '@/data/categories';
import { getMyOverview } from '@/services/personalization';
import type { OffrouRecord } from '@/types/offrou';
import styles from './MyPage.module.css';

const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id);

/** 가벼운 요약: 이번 달 횟수 · 카테고리별 횟수 · 요즘 자주 보낸 시간. 그래프는 쓰지 않는다. */
export function MyOverview({ records }: { records: OffrouRecord[] }) {
  const { monthCount, monthByCategory, frequent } = getMyOverview(new Date(), records);

  return (
    <section className={styles.overview} aria-label="요약">
      <p className={styles.month}>
        {monthCount > 0 ? (
          <>
            이번 달, 다른 시간을 <strong>{monthCount}번</strong> 보냈어.
          </>
        ) : (
          '이번 달은 아직 조용했어.'
        )}
      </p>

      {monthByCategory.length > 0 && (
        <ul className={styles.counts} aria-label="이번 달 카테고리별 횟수">
          {monthByCategory.map(({ categoryId, count }) => {
            const c = categoryOf(categoryId);
            return (
              <li key={categoryId}>
                <span aria-hidden="true">{c?.symbol}</span> {c?.code} <strong>{count}</strong>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.taste}>
        <h2 className={styles.tasteTitle}>요즘 네가 자주 보낸 시간</h2>
        {frequent.length > 0 ? (
          <ul className={styles.tasteList}>
            {frequent.map((id) => {
              const c = categoryOf(id);
              return (
                <li key={id}>
                  <span aria-hidden="true">{c?.symbol}</span> {c?.code}
                  <span className={styles.tasteName}>{c?.name}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.tasteHint}>조금 더 여러 시간을 보내보면 여기에 네 취향이 보여.</p>
        )}
      </div>
    </section>
  );
}
