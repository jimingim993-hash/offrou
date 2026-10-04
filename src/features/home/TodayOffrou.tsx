import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '@/data/categories';
import { formatMinutes } from '@/data/durations';
import { getTodayOffrou } from '@/services/personalization';
import { experiencePath, playPath } from '@/features/experience/paths';
import { Button } from '@/components/ui/Button';
import styles from './HomePage.module.css';

/** 오늘의 OFFROU — 하루에 하나 건네는 시간. 출석·연속 기록·보상은 없다. */
export function TodayOffrou() {
  const navigate = useNavigate();
  const [today] = useState(() => getTodayOffrou());
  if (!today) return null;
  const category = CATEGORIES.find((c) => c.id === today.categoryId);

  return (
    <section aria-labelledby="today-heading" className={styles.today}>
      <h2 id="today-heading" className={styles.todayTitle}>
        오늘의 OFFROU
      </h2>
      <p className={styles.cardText}>오늘 이런 시간은 어때?</p>
      <Link to={experiencePath(today.id)} className={styles.todayCard}>
        <span className={styles.todaySymbol} aria-hidden="true">
          {today.symbol ?? category?.symbol}
        </span>
        <span className={styles.todayText}>
          <span className={styles.todayName}>{today.title}</span>
          <span className={styles.todayInvite}>{today.invite}</span>
          <span className={styles.todayMeta}>
            {category?.code} · {formatMinutes(today.minutes)}
          </span>
        </span>
      </Link>
      <Button block variant="ghost" onClick={() => navigate(playPath(today.id))}>
        오늘의 OFFROU 시작하기
      </Button>
    </section>
  );
}
