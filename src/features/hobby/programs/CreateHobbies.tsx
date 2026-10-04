import { useState } from 'react';
import { DRAWING_TOPICS, HANDWRITING_LINES, OBSERVE_OBJECTS, WRITING_TOPICS } from '@/data/hobby/pools';
import { WORDS } from '@/data/play/pools';
import { pickDistinct, pickOne } from '@/services/random';
import { OptionalTimer } from '@/components/experience/OptionalTimer';
import { DrawingCanvas } from '@/features/play/DrawingCanvas';
import { Actions, Lead, OptionalNote, PlayButton, PlayTimer } from '@/features/play/parts';
import type { HobbyViewProps } from '../types';
import styles from '@/features/play/play.module.css';

/** 10분 드로잉 — 주제 → 종이에 그릴래 / 화면에 그릴래 (화면은 PLAY 공통 캔버스) */
export function DrawingHobby({ program, onDone }: HobbyViewProps) {
  const [topic, setTopic] = useState(() => pickOne(DRAWING_TOPICS));
  const [mode, setMode] = useState<'choose' | 'paper' | 'screen'>('choose');
  const [round, setRound] = useState(0);

  return (
    <>
      <p className={styles.eyebrow}>오늘 그릴 것</p>
      <p className={styles.big}>{topic}</p>
      {mode === 'choose' && (
        <>
          <Lead>어디에 그려볼까?</Lead>
          <Actions>
            <PlayButton onClick={() => setMode('paper')}>종이에 그릴래</PlayButton>
            <PlayButton variant="ghost" onClick={() => setMode('screen')}>
              화면에 그릴래
            </PlayButton>
            <PlayButton variant="quiet" onClick={() => setTopic((t) => pickOne(DRAWING_TOPICS, Math.random, t))}>
              다른 주제
            </PlayButton>
          </Actions>
        </>
      )}
      {mode === 'paper' && (
        <>
          <Lead>{program.instruction}</Lead>
          <p className={styles.hint}>필요한 것: 종이 + 연필이나 펜</p>
          <OptionalTimer minutes={program.optionalTimerMinutes} />
          <Actions>
            <PlayButton onClick={onDone}>다 그렸어</PlayButton>
          </Actions>
        </>
      )}
      {mode === 'screen' && (
        <>
          <OptionalTimer minutes={program.optionalTimerMinutes} />
          <DrawingCanvas key={round} onRestart={() => setRound((r) => r + 1)} onDone={onDone} />
        </>
      )}
    </>
  );
}

/** 5분 글쓰기 — 입력은 선택, 저장하지 않는다 */
export function WritingHobby({ program, onDone }: HobbyViewProps) {
  const [topic, setTopic] = useState(() => pickOne(WRITING_TOPICS));
  return (
    <>
      <p className={styles.eyebrow}>오늘의 글감</p>
      <p className={styles.big}>{topic}</p>
      <Lead>{program.instruction}</Lead>
      <OptionalTimer minutes={program.optionalTimerMinutes} />
      <OptionalNote label="여기에 써도 돼 (저장되지 않아)" />
      <Actions>
        <PlayButton onClick={onDone}>다 썼어</PlayButton>
        <PlayButton variant="ghost" onClick={() => setTopic((t) => pickOne(WRITING_TOPICS, Math.random, t))}>
          다른 주제
        </PlayButton>
      </Actions>
    </>
  );
}

/** 손글씨 — OFFROU가 쓴 문장을 종이에 따라 쓰기 */
export function HandwritingHobby({ program, onDone }: HobbyViewProps) {
  const [line, setLine] = useState(() => pickOne(HANDWRITING_LINES));
  return (
    <>
      <p className={styles.eyebrow}>오늘의 문장</p>
      <p className={styles.big}>{line}</p>
      <Lead>{program.instruction}</Lead>
      <p className={styles.hint}>필요한 것: 종이 + 펜</p>
      <Actions>
        <PlayButton onClick={onDone}>써봤어</PlayButton>
        <PlayButton variant="ghost" onClick={() => setLine((l) => pickOne(HANDWRITING_LINES, Math.random, l))}>
          다른 문장
        </PlayButton>
      </Actions>
    </>
  );
}

/** 짧은 이야기 — PLAY 랜덤 단어 재료로 소재 3개 */
export function StoryHobby({ program, onDone }: HobbyViewProps) {
  const [items, setItems] = useState(() => pickDistinct(WORDS, 3));
  return (
    <>
      <ul className={styles.words} aria-label="오늘의 소재">
        {items.map((w) => (
          <li key={w} className={styles.word}>
            {w}
          </li>
        ))}
      </ul>
      <Lead>{program.instruction}</Lead>
      <OptionalTimer minutes={program.optionalTimerMinutes} />
      <OptionalNote label="이야기를 적어봐도 돼 (저장되지 않아)" />
      <Actions>
        <PlayButton onClick={onDone}>다 썼어</PlayButton>
        <PlayButton variant="ghost" onClick={() => setItems((prev) => pickDistinct(WORDS, 3, Math.random, prev))}>
          다른 소재
        </PlayButton>
      </Actions>
    </>
  );
}

type SketchPhase = 'look' | 'notice' | 'draw';

/** 관찰 스케치 — 30초 관찰 → 특징 세 가지 → 그리기(종이 또는 화면) */
export function ObserveSketchHobby({ program, onDone }: HobbyViewProps) {
  const [object, setObject] = useState(() => pickOne(OBSERVE_OBJECTS));
  const [phase, setPhase] = useState<SketchPhase>('look');
  const [looking, setLooking] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const step = { look: 1, notice: 2, draw: 3 }[phase];

  return (
    <>
      <p className={styles.eyebrow}>{`${step} / 3 단계`}</p>
      <p className={styles.big}>{`오늘의 물건: ${object}`}</p>
      {phase === 'look' && (
        <>
          <Lead>{program.instruction}</Lead>
          {looking ? (
            <PlayTimer seconds={30} onEnd={() => setPhase('notice')} />
          ) : (
            <Actions>
              <PlayButton onClick={() => setLooking(true)}>30초 관찰 시작</PlayButton>
              <PlayButton variant="ghost" onClick={() => setObject((o) => pickOne(OBSERVE_OBJECTS, Math.random, o))}>
                다른 물건
              </PlayButton>
            </Actions>
          )}
          {looking && (
            <Actions>
              <PlayButton variant="quiet" onClick={() => setPhase('notice')}>
                다 봤어
              </PlayButton>
            </Actions>
          )}
        </>
      )}
      {phase === 'notice' && (
        <>
          <Lead>방금 본 물건의 특징 세 가지를 떠올려봐. 모양, 색, 질감 무엇이든.</Lead>
          <OptionalNote label="적어봐도 돼 (저장되지 않아)" />
          <Actions>
            <PlayButton onClick={() => setPhase('draw')}>떠올렸어</PlayButton>
          </Actions>
        </>
      )}
      {phase === 'draw' && !onScreen && (
        <>
          <Lead>그 특징이 보이게 직접 스케치해봐. 종이에 그려도 돼.</Lead>
          <Actions>
            <PlayButton onClick={onDone}>다 그렸어</PlayButton>
            <PlayButton variant="ghost" onClick={() => setOnScreen(true)}>
              화면에 그릴래
            </PlayButton>
          </Actions>
        </>
      )}
      {phase === 'draw' && onScreen && <DrawingCanvas onRestart={() => setOnScreen(true)} onDone={onDone} />}
    </>
  );
}
