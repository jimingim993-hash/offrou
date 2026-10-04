import { Link } from 'react-router-dom';
import { CATEGORIES } from '@/data/categories';
import { formatMinutes } from '@/data/durations';
import { experiencePath } from '@/features/experience/paths';
import type { Experience } from '@/types/offrou';
import { SaveButton } from './SaveButton';
import styles from './ExperienceCard.module.css';

const PLACE_SHORT = { home: '집에서', outside: '밖에서', anywhere: '' } as const;

/** 발견 카드: 제목 · 한 줄 설명 · 예상 시간 · 카테고리 · (필요하면) 장소 · ♡ 저장. 누르면 상세로. */
export function ExperienceCard({ experience: e }: { experience: Experience }) {
  const category = CATEGORIES.find((c) => c.id === e.categoryId);
  const meta = [formatMinutes(e.minutes), category?.code, PLACE_SHORT[e.place]].filter(Boolean).join(' · ');
  // OFFROU 안에서 바로 하는 실행형 놀이는 작은 표시 하나만
  const instant = e.interaction?.type === 'play' ? '바로 놀기' : e.interaction?.type === 'hobby' ? '바로 해보기' : null;

  return (
    <div className={styles.wrap}>
      <Link to={experiencePath(e.id)} className={styles.card}>
        <span className={styles.symbol} aria-hidden="true">
          {e.symbol ?? category?.symbol}
        </span>
        <span className={styles.text}>
          <span className={styles.title}>{e.title}</span>
          <span className={styles.summary}>{e.summary}</span>
          <span className={styles.meta}>
            {meta}
            {instant && <span className={styles.instant}>{instant}</span>}
          </span>
        </span>
      </Link>
      <span className={styles.save}>
        <SaveButton experienceId={e.id} title={e.title} compact />
      </span>
    </div>
  );
}
