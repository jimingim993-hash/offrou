import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ExperienceMeta } from '@/components/experience/ExperienceMeta';
import { OptionalTimer } from '@/components/experience/OptionalTimer';
import type { RunnerProps } from './types';
import styles from './runners.module.css';

/** HOBBY: 강의가 아니라 "오늘의 주제 하나"를 건네고 바로 시작 */
export function FocusRunner({ experience, onFinish }: RunnerProps) {
  const interaction = experience.interaction?.type === 'focus' ? experience.interaction : undefined;
  const [subject] = useState(() => {
    const list = interaction?.subjects ?? [];
    return list[Math.floor(Math.random() * list.length)];
  });

  return (
    <div className={styles.stack}>
      <ExperienceMeta experience={experience} showSupplies={false} />

      <div className={styles.focusCard}>
        <p className={styles.focusLabel}>{interaction?.label ?? '오늘 해볼 것'}</p>
        <p className={styles.focusSubject}>{subject ?? experience.invite}</p>
        <p className={styles.focusSupplies}>
          준비물 · {experience.supplies.length ? experience.supplies.join(' / ') : '없음'}
        </p>
      </div>

      <ul className={styles.tips}>
        {experience.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>

      <div className={styles.center}>
        <OptionalTimer minutes={experience.minutes} />
      </div>

      <div className={styles.finish}>
        <Button block onClick={() => onFinish()}>
          이 시간 마치기
        </Button>
      </div>
    </div>
  );
}
