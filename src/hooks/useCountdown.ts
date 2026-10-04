import { useCallback, useEffect, useRef, useState } from 'react';

export const formatClock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * 공통 카운트다운 (REST 선택형 타이머, PLAY 30초·60초 등).
 * 실제 시각 기준으로 계산하므로 탭이 잠깐 멈춰도 남은 시간이 어긋나지 않는다.
 * onEnd는 끝나는 순간 한 번만 불린다.
 */
export function useCountdown(onEnd?: () => void) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const ended = useRef(false);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const start = useCallback((seconds: number) => {
    const t = Date.now();
    ended.current = false;
    setNow(t);
    setEndAt(t + seconds * 1000);
  }, []);

  const stop = useCallback(() => setEndAt(null), []);

  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt && !ended.current) {
        ended.current = true;
        onEndRef.current?.();
      }
    };
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endAt]);

  const running = endAt !== null;
  const left = running ? Math.max(0, endAt - now) : 0;
  return { start, stop, running, left, done: running && left === 0, label: formatClock(left) };
}
