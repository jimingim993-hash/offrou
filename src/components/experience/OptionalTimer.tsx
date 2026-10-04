import { useEffect, useState } from 'react';
import styles from './OptionalTimer.module.css';

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * 켜고 싶을 때만 켜는 타이머. 끝나도 아무것도 강요하지 않는다.
 * choices가 있으면 그중 하나를 골라 켠다 (예: 휴식 3분/5분).
 */
export function OptionalTimer({ minutes, choices }: { minutes?: number; choices?: number[] }) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const options = choices?.length ? choices : minutes ? [minutes] : [];

  useEffect(() => {
    if (endAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endAt]);

  if (endAt === null) {
    return (
      <div className={styles.choices} role="group" aria-label="선택형 타이머">
        {options.map((m) => (
          <button
            key={m}
            type="button"
            className={styles.toggle}
            onClick={() => {
              const t = Date.now();
              setNow(t);
              setEndAt(t + m * 60_000);
            }}
          >
            타이머 켜기 · {m}분
          </button>
        ))}
      </div>
    );
  }

  const left = endAt - now;
  return (
    <div className={styles.timer} role="timer">
      <span className={left > 0 ? styles.time : styles.over}>{left > 0 ? mmss(left) : '시간이 됐어. 더 머물러도 괜찮아.'}</span>
      <button type="button" className={styles.toggle} onClick={() => setEndAt(null)}>
        타이머 끄기
      </button>
    </div>
  );
}
