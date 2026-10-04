import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './site.module.css';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * 스크롤해서 보일 때 아주 가볍게 떠오르게 한다.
 * 움직임 줄이기 설정이거나 IntersectionObserver가 없으면 처음부터 그대로 보인다.
 */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined' || prefersReducedMotion());

  useEffect(() => {
    if (shown || !ref.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [shown]);

  return (
    <div ref={ref} className={`${styles.reveal} ${shown ? styles.revealed : ''} ${className}`}>
      {children}
    </div>
  );
}
