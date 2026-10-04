import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_BASE } from '@/app/paths';
import { MOODS } from '@/data/moods';
import { DURATIONS } from '@/data/durations';
import type { DurationId, MoodId } from '@/types/offrou';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { buildReadyPath } from '@/features/ready/readyParams';
import { TodayOffrou } from './TodayOffrou';
import { Onboarding, ResumeCard } from './HomeNotices';
import styles from './HomePage.module.css';

/**
 * 서비스 HOME. 시작하는 방법을 네 가지로 건넨다:
 * 지금 딱 하나 · 나에게 맞춰서(상태+시간) · 작은 OFFROU 코스 · 오늘의 OFFROU
 */
export function HomePage() {
  const navigate = useNavigate();
  const [mood, setMood] = useState<MoodId | null>(null);
  const [duration, setDuration] = useState<DurationId | null>(null);
  const timeSectionRef = useRef<HTMLElement>(null);
  const moodRef = useRef<HTMLHeadingElement>(null);

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
        <p className={styles.lead}>
          <span>오늘도 비슷한 하루였어?</span> <span>잠깐 다른 시간으로 가볼까?</span>
        </p>
        <h1 className={styles.title}>오늘은 어떤 시간을 보내볼까?</h1>
      </header>

      <Onboarding onStart={() => moodRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })} />
      <ResumeCard />

      <section aria-labelledby="now-heading" className={styles.card}>
        <h2 id="now-heading" className={styles.cardTitle}>
          <span aria-hidden="true">⚡ </span>지금 딱 하나
        </h2>
        <p className={styles.cardText}>생각하기 싫으면 그냥 눌러봐.</p>
        <Button block onClick={() => navigate(`${APP_BASE}/now`)}>
          바로 시작
        </Button>
      </section>

      <section aria-labelledby="fit-heading" className={styles.section}>
        <h2 id="fit-heading" className={styles.sectionTitle}>
          나에게 맞춰서
        </h2>
        <h3 id="mood-heading" ref={moodRef} className={styles.question}>
          지금 어떤 시간이 필요해?
        </h3>
        <div className={styles.moodGrid} role="group" aria-labelledby="mood-heading">
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

        {hasMood && (
          <section ref={timeSectionRef} aria-labelledby="time-heading" className={`${styles.subSection} rise`}>
            <h3 id="time-heading" className={styles.question}>
              얼마나 시간이 있어?
            </h3>
            <div className={styles.chips}>
              {DURATIONS.map((d) => (
                <Chip key={d.id} label={d.label} selected={duration === d.id} onSelect={() => setDuration(d.id)} />
              ))}
            </div>

            <div className={styles.next}>
              <Button block disabled={!canProceed} onClick={() => canProceed && navigate(buildReadyPath(mood, duration))}>
                다음
              </Button>
            </div>
          </section>
        )}
      </section>

      <section aria-labelledby="course-heading" className={styles.card}>
        <h2 id="course-heading" className={styles.cardTitle}>
          <span aria-hidden="true">🧭 </span>작은 OFFROU 코스
        </h2>
        <p className={styles.cardText}>조금 더 길게 다른 시간을 보내고 싶다면.</p>
        <Button block variant="ghost" onClick={() => navigate(`${APP_BASE}/course`)}>
          코스 만들기
        </Button>
      </section>

      <TodayOffrou />
    </div>
  );
}
