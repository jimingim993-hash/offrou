import styles from './ProgressDots.module.css';

interface ProgressDotsProps {
  total: number;
  /** 1부터 시작 */
  current: number;
}

/** "2 / 5" 정도만 알려주는 부드러운 진행 표시 */
export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.dots} role="img" aria-label={`${current} / ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`${styles.dot} ${i < current ? styles.on : ''} ${i === current - 1 ? styles.now : ''}`} />
        ))}
      </div>
      <span className={styles.count} aria-hidden="true">
        {current} / {total}
      </span>
    </div>
  );
}
