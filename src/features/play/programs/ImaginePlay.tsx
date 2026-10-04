import { useState } from 'react';
import { QUESTIONS, STORY_EMOJIS } from '@/data/play/pools';
import { pickDistinct, pickOne } from '@/services/random';
import { Actions, Lead, OptionalNote, PlayButton, type PlayViewProps } from '../parts';
import styles from '../play.module.css';

/** 랜덤 질문 — 생각만 해도, 적어도 된다 */
export function QuestionPlay({ program, onDone }: PlayViewProps) {
  const [question, setQuestion] = useState(() => pickOne(QUESTIONS));
  return (
    <>
      <p className={styles.big}>{question}</p>
      <Lead>{program.instruction}</Lead>
      <OptionalNote />
      <Actions>
        <PlayButton onClick={onDone}>다 했어</PlayButton>
        <PlayButton variant="ghost" onClick={() => setQuestion((q) => pickOne(QUESTIONS, Math.random, q))}>
          다른 질문
        </PlayButton>
      </Actions>
    </>
  );
}

const emojiSet = (avoid: readonly string[] = []) => pickDistinct(STORY_EMOJIS, 3 + Math.floor(Math.random() * 3), Math.random, avoid);

/** 이모지 이야기 — 3~5개 조합으로 상상하기 */
export function EmojiPlay({ program, onDone }: PlayViewProps) {
  const [emojis, setEmojis] = useState<string[]>(() => emojiSet());
  return (
    <>
      <p className={styles.emojis} aria-label={`이모지 ${emojis.length}개: ${emojis.join(' ')}`}>
        {emojis.map((e) => (
          <span key={e}>{e}</span>
        ))}
      </p>
      <Lead>{program.instruction}</Lead>
      <OptionalNote />
      <Actions>
        <PlayButton onClick={onDone}>다 했어</PlayButton>
        <PlayButton variant="ghost" onClick={() => setEmojis((prev) => emojiSet(prev))}>
          다른 조합
        </PlayButton>
      </Actions>
    </>
  );
}
