import { useState } from 'react';
import { WORDS } from '@/data/play/pools';
import { pickDistinct } from '@/services/random';
import { Actions, Lead, OptionalNote, PlayButton, type PlayViewProps } from '../parts';
import styles from '../play.module.css';

/** 랜덤 단어 3개 → 세 단어가 들어가는 이야기 상상하기 */
export function WordsPlay({ program, onDone }: PlayViewProps) {
  const [words, setWords] = useState(() => pickDistinct(WORDS, 3));
  const [started, setStarted] = useState(false);

  const wordList = (
    <ul className={styles.words} aria-label="오늘의 단어">
      {words.map((w) => (
        <li key={w} className={styles.word}>
          {w}
        </li>
      ))}
    </ul>
  );

  if (!started)
    return (
      <>
        {wordList}
        <Actions>
          <PlayButton onClick={() => setStarted(true)}>시작</PlayButton>
          <PlayButton variant="ghost" onClick={() => setWords((prev) => pickDistinct(WORDS, 3, Math.random, prev))}>
            다른 단어
          </PlayButton>
        </Actions>
      </>
    );

  return (
    <>
      {wordList}
      <Lead>{program.instruction}</Lead>
      <OptionalNote />
      <Actions>
        <PlayButton onClick={onDone}>다 했어</PlayButton>
      </Actions>
    </>
  );
}
