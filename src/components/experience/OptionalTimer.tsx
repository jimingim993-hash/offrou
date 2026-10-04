import { useCountdown } from '@/hooks/useCountdown';
import styles from './OptionalTimer.module.css';

/**
 * 켜고 싶을 때만 켜는 타이머. 끝나도 아무것도 강요하지 않는다.
 * choices가 있으면 그중 하나를 골라 켠다 (예: 휴식 3분/5분).
 */
export function OptionalTimer({ minutes, choices }: { minutes?: number; choices?: number[] }) {
  const timer = useCountdown();
  const options = choices?.length ? choices : minutes ? [minutes] : [];

  if (!timer.running) {
    return (
      <div className={styles.choices} role="group" aria-label="선택형 타이머">
        {options.map((m) => (
          <button key={m} type="button" className={styles.toggle} onClick={() => timer.start(m * 60)}>
            타이머 켜기 · {m}분
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.timer} role="timer">
      <span className={timer.done ? styles.over : styles.time}>{timer.done ? '시간이 됐어. 더 머물러도 괜찮아.' : timer.label}</span>
      <button type="button" className={styles.toggle} onClick={timer.stop}>
        타이머 끄기
      </button>
    </div>
  );
}
