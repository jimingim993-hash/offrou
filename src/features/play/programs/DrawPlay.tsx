import { useState } from 'react';
import { DRAW_TOPICS } from '@/data/play/pools';
import { pickOne } from '@/services/random';
import { Actions, PlayButton, PlayTimer, type PlayViewProps } from '../parts';
import { DrawingCanvas } from '../DrawingCanvas';
import styles from '../play.module.css';

/** 1분 낙서 — 주제 하나 → 공통 낙서 캔버스(DrawingCanvas). 그림은 저장·업로드하지 않는다. */
export function DrawPlay({ program, onDone }: PlayViewProps) {
  const [topic, setTopic] = useState(() => pickOne(DRAW_TOPICS));
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [timeUp, setTimeUp] = useState(false);

  if (!started)
    return (
      <>
        <p className={styles.eyebrow}>오늘의 주제</p>
        <p className={styles.big}>{topic}</p>
        <Actions>
          <PlayButton onClick={() => setStarted(true)}>시작</PlayButton>
          <PlayButton variant="ghost" onClick={() => setTopic((t) => pickOne(DRAW_TOPICS, Math.random, t))}>
            새로운 주제
          </PlayButton>
        </Actions>
      </>
    );

  return (
    <>
      <p className={styles.topicLine}>
        <span className={styles.eyebrow}>주제</span> {topic}
      </p>
      <PlayTimer key={round} seconds={program.seconds ?? 60} onEnd={() => setTimeUp(true)} />
      {timeUp && (
        <p className={styles.reaction} role="status">
          1분이 지났어. 더 그려도 괜찮아.
        </p>
      )}
      <DrawingCanvas
        key={`canvas-${round}`}
        onRestart={() => {
          setTimeUp(false);
          setRound((r) => r + 1);
        }}
        onDone={onDone}
      />
    </>
  );
}
