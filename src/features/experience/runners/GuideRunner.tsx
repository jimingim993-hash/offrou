import { Button } from '@/components/ui/Button';
import { ExperienceMeta } from '@/components/experience/ExperienceMeta';
import type { RunnerProps } from './types';
import styles from './runners.module.css';

/** 기본 실행기: 준비물과 진행 방법 (OUT 등) */
export function GuideRunner({ experience, onFinish }: RunnerProps) {
  return (
    <div className={styles.stack}>
      <ExperienceMeta experience={experience} showSupplies={false} />

      {experience.supplies.length > 0 && (
        <section className={styles.section} aria-labelledby="supplies-heading">
          <h2 id="supplies-heading" className={styles.heading}>
            준비물
          </h2>
          <ul className={styles.supplies}>
            {experience.supplies.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section} aria-labelledby="steps-heading">
        <h2 id="steps-heading" className={styles.heading}>
          이렇게 해봐
        </h2>
        <ol className={styles.steps}>
          {experience.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <div className={styles.finish}>
        <p className={styles.note}>시간을 다 채우지 않아도 괜찮아. 언제든 마쳐도 돼.</p>
        <Button block onClick={() => onFinish()}>
          이 시간 마치기
        </Button>
      </div>
    </div>
  );
}
