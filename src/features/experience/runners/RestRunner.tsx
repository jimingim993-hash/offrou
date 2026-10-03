import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Orb } from '@/components/ui/Orb';
import { OptionalTimer } from '@/components/experience/OptionalTimer';
import type { RunnerProps } from './types';
import styles from './runners.module.css';

/** REST: 문장 하나와 조용한 배경. 타이머는 원할 때만. */
export function RestRunner({ experience, onFinish }: RunnerProps) {
  const interaction = experience.interaction?.type === 'rest' ? experience.interaction : undefined;
  const tone = interaction?.tone ?? 'sky';

  return (
    <div className={styles.rest}>
      {/* 화면 전체 배경. 전환 애니메이션의 transform에 갇히지 않도록 body에 그린다 */}
      {createPortal(<div className={`${styles.backdrop} ${styles[`tone-${tone}`]}`} aria-hidden="true" />, document.body)}
      <Orb />
      <p className={styles.restPrompt}>{interaction?.prompt ?? experience.invite}</p>

      <details className={styles.how}>
        <summary>어떻게 하면 돼?</summary>
        <ol>
          {experience.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </details>

      <OptionalTimer minutes={experience.minutes} />

      <div className={styles.finish}>
        <Button block variant="ghost" onClick={() => onFinish()}>
          이 시간 마치기
        </Button>
      </div>
    </div>
  );
}
