import { useState } from 'react';
import { MEMORY_ITEMS } from '@/data/play/pools';
import { pickDistinct, shuffle } from '@/services/random';
import { Actions, Lead, PlayButton, PlayTimer, type PlayViewProps } from '../parts';
import styles from '../play.module.css';

type Item = (typeof MEMORY_ITEMS)[number];
type Phase = 'ready' | 'show' | 'recall' | 'result';

/** 보여줄 개수 (어렵지 않게) */
export const MEMORY_SHOW = 5;

/** 5초 기억하기 — 점수 누적·최고기록·실패 판정 없이 "몇 개 기억했네"까지만 */
export function MemoryPlay({ program, onDone }: PlayViewProps) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [shown, setShown] = useState<Item[]>([]);
  const [options, setOptions] = useState<Item[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  const begin = () => {
    const show = pickDistinct(MEMORY_ITEMS, MEMORY_SHOW);
    const others = pickDistinct(MEMORY_ITEMS.filter((i) => !show.includes(i)), MEMORY_SHOW);
    setShown(show);
    setOptions(shuffle([...show, ...others]));
    setPicked([]);
    setPhase('show');
  };

  if (phase === 'ready')
    return (
      <>
        <Lead>준비되면 시작을 눌러. {program.instruction}</Lead>
        <Actions>
          <PlayButton onClick={begin}>시작</PlayButton>
        </Actions>
      </>
    );

  if (phase === 'show')
    return (
      <>
        <PlayTimer seconds={program.seconds ?? 5} onEnd={() => setPhase('recall')} />
        <ul className={styles.memoryGrid} aria-label="기억할 것들">
          {shown.map((i) => (
            <li key={i.name} className={styles.memoryItem}>
              <span aria-hidden="true">{i.emoji}</span>
              <span className={styles.memoryName}>{i.name}</span>
            </li>
          ))}
        </ul>
      </>
    );

  const correct = picked.filter((n) => shown.some((s) => s.name === n)).length;

  if (phase === 'recall')
    return (
      <>
        <Lead>뭐가 있었는지 기억나? 생각나는 걸 골라봐.</Lead>
        <div className={styles.memoryOptions} role="group" aria-label="기억나는 것 고르기">
          {options.map((i) => {
            const on = picked.includes(i.name);
            return (
              <button
                key={i.name}
                type="button"
                className={`${styles.memoryOption} ${on ? styles.answerOn : ''}`}
                aria-pressed={on}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== i.name) : [...p, i.name]))}
              >
                <span aria-hidden="true">{i.emoji}</span> {i.name}
              </button>
            );
          })}
        </div>
        <Actions>
          <PlayButton onClick={() => setPhase('result')}>다 골랐어</PlayButton>
        </Actions>
      </>
    );

  return (
    <>
      <p className={styles.big} role="status">
        {correct > 0 ? `${correct}개 기억했네.` : '이번엔 잘 안 떠올랐네. 그래도 괜찮아.'}
      </p>
      <p className={styles.hint}>
        있었던 것: {shown.map((s) => `${s.emoji} ${s.name}`).join(' · ')}
      </p>
      <Actions>
        <PlayButton onClick={onDone}>다 했어</PlayButton>
        <PlayButton variant="ghost" onClick={begin}>
          한 번 더
        </PlayButton>
      </Actions>
    </>
  );
}
