import { useState } from 'react';
import { CHOICES, CHOICE_REACTIONS } from '@/data/play/pools';
import { pickOne, shuffle } from '@/services/random';
import { Actions, Lead, PlayButton, type PlayViewProps } from '../parts';
import styles from '../play.module.css';

/** 오늘의 작은 선택 — 둘 중 하나. 정답도 평가도 없다. */
export function ChoicePlay({ program, onDone }: PlayViewProps) {
  // 한 번 섞은 순서대로 → 같은 질문이 반복되지 않는다
  const [order] = useState(() => shuffle(CHOICES));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [reaction, setReaction] = useState('');
  const [left, right] = order[index % order.length];

  const choose = (side: 0 | 1) => {
    if (picked !== null) return;
    setPicked(side);
    setReaction((prev) => pickOne(CHOICE_REACTIONS, Math.random, prev));
  };

  return (
    <>
      <Lead>{program.instruction}</Lead>
      <div className={styles.versus} role="group" aria-label="둘 중 하나">
        <button
          type="button"
          className={`${styles.option} ${picked === 0 ? styles.optionOn : ''}`}
          aria-pressed={picked === 0}
          onClick={() => choose(0)}
        >
          {left}
        </button>
        <span className={styles.vs} aria-hidden="true">
          VS
        </span>
        <button
          type="button"
          className={`${styles.option} ${picked === 1 ? styles.optionOn : ''}`}
          aria-pressed={picked === 1}
          onClick={() => choose(1)}
        >
          {right}
        </button>
      </div>

      {picked !== null && (
        <>
          <p className={styles.reaction} role="status">
            {reaction}
          </p>
          <Actions>
            <PlayButton
              onClick={() => {
                setIndex((i) => i + 1);
                setPicked(null);
              }}
            >
              다음 질문
            </PlayButton>
            <PlayButton variant="ghost" onClick={onDone}>
              여기까지
            </PlayButton>
          </Actions>
        </>
      )}
    </>
  );
}
