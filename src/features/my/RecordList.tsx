import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '@/data/categories';
import { formatMinutes } from '@/data/durations';
import { getExperience } from '@/services/experiences';
import { experiencePath } from '@/features/experience/paths';
import type { OffrouRecord } from '@/types/offrou';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import styles from './MyPage.module.css';

const dayLabel = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;

/** 최신순 기록을 날짜별로 묶는다 */
function groupByDay(records: OffrouRecord[]) {
  const groups: { key: string; label: string; items: OffrouRecord[] }[] = [];
  for (const r of records) {
    const date = new Date(r.completedAt);
    const key = date.toDateString();
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(r);
    else groups.push({ key, label: dayLabel(date), items: [r] });
  }
  return groups;
}

/** 지나온 시간 */
export function RecordList({ records }: { records: OffrouRecord[] }) {
  const navigate = useNavigate();

  if (records.length === 0) {
    return (
      <EmptyState symbol="🍃" title="아직 남겨진 시간이 없어." description="첫 번째 OFFROU를 경험하면 여기에 하나씩 쌓일 거야.">
        <Button onClick={() => navigate('/')}>첫 OFFROU 시작하기</Button>
      </EmptyState>
    );
  }

  return (
    <div className={styles.timeline}>
      {groupByDay(records).map((g) => (
        <section key={g.key} className={styles.day} aria-label={g.label}>
          <h2 className={styles.date}>{g.label}</h2>
          <ul className={styles.list}>
            {g.items.map((r) => {
              const category = CATEGORIES.find((c) => c.id === r.categoryId);
              return (
                <li key={r.id}>
                  <Link to={experiencePath(r.experienceId)} className={styles.card}>
                    <span className={styles.symbol} aria-hidden="true">
                      {getExperience(r.experienceId)?.symbol ?? category?.symbol}
                    </span>
                    <span className={styles.text}>
                      <span className={styles.title}>{r.title}</span>
                      {r.endingTitle && <span className={styles.ending}>“{r.endingTitle}”</span>}
                      <span className={styles.meta}>
                        {category?.code} · {formatMinutes(r.minutes)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
