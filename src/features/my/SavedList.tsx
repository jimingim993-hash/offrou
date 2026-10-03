import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '@/data/categories';
import { formatMinutes } from '@/data/durations';
import { getExperience } from '@/services/experiences';
import type { SavedItem } from '@/services/saved';
import { experiencePath } from '@/features/experience/paths';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { SaveButton } from '@/components/experience/SaveButton';
import styles from './MyPage.module.css';

/** 저장한 시간 */
export function SavedList({ saved }: { saved: SavedItem[] }) {
  const navigate = useNavigate();
  // 콘텐츠가 사라진 저장 항목은 조용히 건너뛴다
  const items = saved.map((s) => getExperience(s.experienceId)).filter((e) => e !== undefined);

  if (items.length === 0) {
    return (
      <EmptyState symbol="♡" title="아직 저장한 시간이 없어." description="발견에서 나중에 해보고 싶은 시간을 ♡로 남겨둘 수 있어.">
        <Button variant="ghost" onClick={() => navigate('/discover')}>
          발견 둘러보기
        </Button>
      </EmptyState>
    );
  }

  return (
    <ul className={styles.list}>
      {items.map((e) => {
        const category = CATEGORIES.find((c) => c.id === e.categoryId);
        return (
          <li key={e.id} className={styles.savedRow}>
            <Link to={experiencePath(e.id)} className={styles.card}>
              <span className={styles.symbol} aria-hidden="true">
                {e.symbol ?? category?.symbol}
              </span>
              <span className={styles.text}>
                <span className={styles.title}>{e.title}</span>
                <span className={styles.meta}>
                  {category?.code} · {formatMinutes(e.minutes)}
                </span>
              </span>
            </Link>
            <span className={styles.savedToggle}>
              <SaveButton experienceId={e.id} title={e.title} compact />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
