import { useState } from 'react';
import { ExperienceCard } from '@/components/experience/ExperienceCard';
import { pickFirstMeet } from '@/services/discovery';
import { getRecords } from '@/services/records';
import type { Experience } from '@/types/offrou';
import styles from './DiscoverPage.module.css';

/** 처음 만나는 시간: 아직 해보지 않은 경험 하나만. 화면에 들어올 때 한 번 고른다. */
export function FirstMeet({ list }: { list: Experience[] }) {
  const [pick] = useState(() => pickFirstMeet(list, new Set(getRecords().map((r) => r.experienceId))));
  if (!pick) return null;

  return (
    <section className={styles.firstMeet} aria-labelledby="first-meet-title">
      <h2 id="first-meet-title" className={styles.sectionTitle}>
        <span aria-hidden="true">✨ </span>처음 만나는 시간
      </h2>
      <ExperienceCard experience={pick} />
    </section>
  );
}
