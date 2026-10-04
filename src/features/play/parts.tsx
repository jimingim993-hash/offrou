import { useEffect, useId, useState, type ReactNode } from 'react';
import { useCountdown } from '@/hooks/useCountdown';
import type { PlayProgram } from '@/data/play/types';
import styles from './play.module.css';

/** 각 프로그램 화면이 받는 공통 props */
export interface PlayViewProps {
  program: PlayProgram;
  /** 끝까지 했을 때 (완료 기록은 진행 화면이 맡는다) */
  onDone: () => void;
}

/**
 * 놀이용 타이머. 남은 시간을 크게 보여주고, 시작·끝은 화면 읽기 프로그램에 한 번씩만 알린다.
 * 끝나도 아무것도 강요하지 않는다 (onEnd로 다음 단계를 보여줄 뿐).
 */
export function PlayTimer({ seconds, onEnd, autoStart = true }: { seconds: number; onEnd?: () => void; autoStart?: boolean }) {
  const timer = useCountdown(onEnd);
  const { start } = timer;
  useEffect(() => {
    if (autoStart) start(seconds);
  }, [autoStart, seconds, start]);

  const announce = timer.done ? '시간이 됐어.' : timer.running ? `${seconds}초 타이머를 시작했어.` : '';
  return (
    <div className={styles.timerBox}>
      <span className={styles.timer} role="timer" aria-label={`남은 시간 ${timer.label}`}>
        {timer.running ? (timer.done ? '0:00' : timer.label) : `0:${String(seconds).padStart(2, '0')}`}
      </span>
      <span className={styles.srOnly} aria-live="polite">
        {announce}
      </span>
    </div>
  );
}

/** 적어보고 싶을 때만 쓰는 메모. 저장하지 않는다. */
export function OptionalNote({ label = '적어보고 싶으면 여기에 (저장되지 않아)' }: { label?: string }) {
  const id = useId();
  const [text, setText] = useState('');
  return (
    <div className={styles.note}>
      <label htmlFor={id} className={styles.noteLabel}>
        {label}
      </label>
      <textarea id={id} className={styles.textarea} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
}

/** 평가하지 않는 가벼운 대답 버튼들 */
export function AnswerButtons({ answers, onAnswer, label }: { answers: readonly string[]; onAnswer: (a: string) => void; label: string }) {
  return (
    <div className={styles.answers} role="group" aria-label={label}>
      {answers.map((a) => (
        <button key={a} type="button" className={styles.answer} onClick={() => onAnswer(a)}>
          {a}
        </button>
      ))}
    </div>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

export function PlayButton({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'ghost' | 'quiet';
  disabled?: boolean;
}) {
  return (
    <button type="button" className={`${styles.button} ${styles[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/** 프로그램 안내 문장 (한 화면에 하나) */
export const Lead = ({ children }: { children: ReactNode }) => <p className={styles.lead}>{children}</p>;
