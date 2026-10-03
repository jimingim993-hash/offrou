import { useEffect, useState } from 'react';
import styles from './OptionalTimer.module.css';

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** 켜고 싶을 때만 켜는 타이머. 끝나도 아무것도 강요하지 않는다. */
export function OptionalTimer({ minutes }: { minutes: number }) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endAt]);

  if (endAt === null) {
    return (
      <button
        type="button"
        className={styles.toggle}
        onClick={() => {
          const t = Date.now();
          setNow(t);
          setEndAt(t + minutes * 60_000);
        }}
      >
        타이머 켜기 · {minutes}분
      </button>
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
