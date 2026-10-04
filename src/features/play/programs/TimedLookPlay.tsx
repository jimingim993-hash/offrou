import { useState } from 'react';
import { SOUND_KINDS } from '@/data/play/pools';
import { Actions, AnswerButtons, Lead, PlayButton, PlayTimer, type PlayViewProps } from '../parts';
import styles from '../play.module.css';

type Phase = 'ready' | 'running' | 'ask';

/** 30초 관찰 — 타이머 동안 주변을 보고, 끝나면 가볍게 묻는다 (어느 답도 평가하지 않음) */
export function ObservePlay({ program, onDone }: PlayViewProps) {
  const [phase, setPhase] = useState<Phase>('ready');
  const seconds = program.seconds ?? 30;

  if (phase === 'ready')
    return (
      <>
        <Lead>{program.instruction}</Lead>
        <Actions>
          <PlayButton onClick={() => setPhase('running')}>{seconds}초 시작</PlayButton>
        </Actions>
      </>
    );

  if (phase === 'running')
    return (
      <>
        <PlayTimer seconds={seconds} onEnd={() => setPhase('ask')} />
        <p className={styles.big}>주변을 천천히 둘러봐.</p>
        <Actions>
          <PlayButton variant="quiet" onClick={() => setPhase('ask')}>
            다 봤어
          </PlayButton>
        </Actions>
      </>
    );

  return (
    <>
      <Lead>{program.ask?.question}</Lead>
      <AnswerButtons label={program.ask?.question ?? ''} answers={program.ask?.answers ?? []} onAnswer={onDone} />
    </>
  );
}

/** 소리 찾기 — 마이크를 쓰지 않는다. 들은 소리를 원하면 골라보기만 */
export function ListenPlay({ program, onDone }: PlayViewProps) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [heard, setHeard] = useState<string[]>([]);
  const seconds = program.seconds ?? 30;

  if (phase === 'ready')
    return (
      <>
        <p className={styles.big}>잠깐 귀를 기울여봐.</p>
        <Lead>{program.instruction}</Lead>
        <p className={styles.hint}>마이크를 쓰거나 녹음하지 않아.</p>
        <Actions>
          <PlayButton onClick={() => setPhase('running')}>시작</PlayButton>
        </Actions>
      </>
    );

  if (phase === 'running')
    return (
      <>
        <PlayTimer seconds={seconds} onEnd={() => setPhase('ask')} />
        <p className={styles.big}>눈을 감아도 좋아. 소리 세 가지.</p>
        <Actions>
          <PlayButton variant="quiet" onClick={() => setPhase('ask')}>
            다 들었어
          </PlayButton>
        </Actions>
      </>
    );

  const toggle = (s: string) => setHeard((h) => (h.includes(s) ? h.filter((x) => x !== s) : [...h, s]));
  return (
    <>
      <Lead>{program.ask?.question}</Lead>
      <div className={styles.answers} role="group" aria-label="들린 소리 (여러 개 골라도 돼)">
        {SOUND_KINDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.answer} ${heard.includes(s) ? styles.answerOn : ''}`}
            aria-pressed={heard.includes(s)}
            onClick={() => toggle(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <Actions>
        <PlayButton onClick={onDone}>다 했어</PlayButton>
      </Actions>
    </>
  );
}

