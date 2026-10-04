import { useState, type CSSProperties } from 'react';
import { COLORS } from '@/data/play/pools';
import { pickOne } from '@/services/random';
import { Actions, AnswerButtons, Lead, PlayButton, PlayTimer, type PlayViewProps } from '../parts';
import styles from '../play.module.css';

type Phase = 'ready' | 'finding' | 'ask';

/** 색깔 찾기 — 색 이름은 늘 글자로 함께 보여준다. 타이머는 고를 때만. */
export function FindColorPlay({ program, onDone }: PlayViewProps) {
  const [color, setColor] = useState(() => pickOne(COLORS));
  const [phase, setPhase] = useState<Phase>('ready');
  const [timed, setTimed] = useState(false);
  const seconds = program.seconds ?? 60;

  const badge = (
    <div className={styles.colorBadge}>
      <span className={styles.swatch} style={{ '--swatch': color.swatch } as CSSProperties} aria-hidden="true" />
      <p className={styles.big}>{color.name}을 찾아봐.</p>
    </div>
  );

  if (phase === 'ready')
    return (
      <>
        {badge}
        <Lead>{program.instruction.replace('이 색', color.name)}</Lead>
        <Actions>
          <PlayButton
            onClick={() => {
              setTimed(true);
              setPhase('finding');
            }}
          >
            {seconds}초 시작
          </PlayButton>
          <PlayButton variant="ghost" onClick={() => setPhase('finding')}>
            그냥 찾을래
          </PlayButton>
          <PlayButton variant="quiet" onClick={() => setColor((c) => pickOne(COLORS, Math.random, c))}>
            다른 색
          </PlayButton>
        </Actions>
      </>
    );

  if (phase === 'finding')
    return (
      <>
        {badge}
        {timed && <PlayTimer seconds={seconds} onEnd={() => setPhase('ask')} />}
        <Lead>{`주변에서 ${color.name} 물건을 3개 찾아보자.`}</Lead>
        <Actions>
          <PlayButton onClick={() => setPhase('ask')}>다 찾았어</PlayButton>
        </Actions>
      </>
    );

  return (
    <>
      {badge}
      <Lead>{program.ask?.question}</Lead>
      <AnswerButtons label={program.ask?.question ?? ''} answers={program.ask?.answers ?? []} onAnswer={onDone} />
    </>
  );
}
