import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOODS } from '@/data/moods';
import { DURATIONS } from '@/data/durations';
import type { DurationId, MoodId } from '@/types/offrou';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { buildReadyPath } from '@/features/ready/readyParams';
import styles from './HomePage.module.css';

export function HomePage() {
  const navigate = useNavigate();
  const [mood, setMood] = useState<MoodId | null>(null);
  const [duration, setDuration] = useState<DurationId | null>(null);
  const timeSectionRef = useRef<HTMLElement>(null);

  // 상태를 처음 고르면 시간 선택 영역으로 부드럽게 이동
  const hasMood = mood !== null;
  useEffect(() => {
    if (hasMood) timeSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [hasMood]);

  const canProceed = mood !== null && duration !== null;

  return (
    <div className={styles.home}>
      <header className={styles.hero}>
        <p className={styles.brand}>OFFROU</p>
        <h1 className={styles.title}>
          오늘도 비슷한 하루였어?
          <br />
          <span className={styles.titleSoft}>잠깐 다른 시간으로 가볼까?</span>
        </h1>
      </header>

      <section aria-labelledby="mood-heading" className={styles.section}>
        <h2 id="mood-heading" className={styles.question}>
          지금 어떤 시간이 필요해?
        </h2>
        <div className={styles.moodGrid}>
          {MOODS.map((m) => (
            <ChoiceCard
              key={m.id}
              label={m.label}
              symbol={m.symbol}
              selected={mood === m.id}
              onSelect={() => setMood(m.id)}
            />
          ))}
        </div>
      </section>

      {hasMood && (
        <section ref={timeSectionRef} aria-labelledby="time-heading" className={`${styles.section} rise`}>
          <h2 id="time-heading" className={styles.question}>
            얼마나 시간이 있어?
          </h2>
          <div className={styles.chips}>
            {DURATIONS.map((d) => (
              <Chip
                key={d.id}
                label={d.label}
                selected={duration === d.id}
                onSelect={() => setDuration(d.id)}
              />
            ))}
          </div>

          <div className={styles.next}>
            <Button
              block
              disabled={!canProceed}
              onClick={() => canProceed && navigate(buildReadyPath(mood, duration))}
            >
              다음
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
