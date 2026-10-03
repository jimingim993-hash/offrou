import type { ReactNode } from 'react';
import { CATEGORIES } from '@/data/categories';
import type { Experience } from '@/types/offrou';
import { ExperienceMeta } from './ExperienceMeta';
import { SaveButton } from './SaveButton';
import styles from './ExperienceIntro.module.css';

interface ExperienceIntroProps {
  experience: Experience;
  /** 추천 이유 같은 짧은 한 줄 */
  note?: string;
  /** 하단 버튼 영역 */
  children?: ReactNode;
}

/** 경험 하나를 건네는 카드 (추천 결과 · 발견 상세 공용) */
export function ExperienceIntro({ experience, note, children }: ExperienceIntroProps) {
  const category = CATEGORIES.find((c) => c.id === experience.categoryId);
  return (
    <article className={`${styles.intro} rise`}>
      <div className={styles.top}>
        {category && (
          <p className={styles.category}>
            <span aria-hidden="true">{category.symbol}</span> {category.code}
          </p>
        )}
        <SaveButton experienceId={experience.id} />
      </div>
      {note && <p className={styles.note}>{note}</p>}
      <h1 className={styles.invite}>{experience.invite}</h1>
      <p className={styles.summary}>{experience.summary}</p>
      <ExperienceMeta experience={experience} />
      {children && <div className={styles.actions}>{children}</div>}
    </article>
  );
}
