import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Orb } from '@/components/ui/Orb';
import { OptionalTimer } from '@/components/experience/OptionalTimer';
import type { RunnerProps } from './types';
import styles from './runners.module.css';

/** 휴식 타이머 선택지 (선택 사항, 시간을 채워야 끝나는 구조가 아니다) */
const REST_TIMER_CHOICES = [3, 5];

/**
 * REST: 문장 하나와 조용한 배경. 짧은 문장이 있으면 천천히 하나씩 떠오른다.
 * 타이머는 원할 때만 (3분/5분). 효과를 약속하지 않는다 — 그냥 쉬어가는 화면이다.
 */
export function RestRunner({ experience, onFinish }: RunnerProps) {
  const interaction = experience.interaction?.type === 'rest' ? experience.interaction : undefined;
  const tone = interaction?.tone ?? 'sky';

  return (
    <div className={styles.rest}>
      {/* 화면 전체 배경. 전환 애니메이션의 transform에 갇히지 않도록 body에 그린다 */}
      {createPortal(<div className={`${styles.backdrop} ${styles[`tone-${tone}`]}`} aria-hidden="true" />, document.body)}
      <Orb />
      <p className={styles.restPrompt}>{interaction?.prompt ?? experience.invite}</p>

      {interaction?.lines?.length ? (
        <div className={styles.slowLines}>
          {interaction.lines.map((line, i) => (
            <p key={line} className={styles.slowLine} style={{ '--i': i } as CSSProperties}>
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <p className={styles.putDown}>휴대폰은 잠시 내려놓아도 괜찮아. 다 쉬었으면 돌아와서 마치기를 눌러.</p>

      <details className={styles.how}>
        <summary>어떻게 하면 돼?</summary>
        <ol>
          {experience.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </details>

      <OptionalTimer choices={REST_TIMER_CHOICES} />

      <div className={styles.finish}>
        <Button block variant="ghost" onClick={() => onFinish()}>
          이 시간 마치기
        </Button>
      </div>
    </div>
  );
}
