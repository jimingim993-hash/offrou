import { formatMinutes } from '@/data/durations';
import { COST_LABELS, PLACE_LABELS } from '@/data/places';
import type { Experience } from '@/types/offrou';
import styles from './ExperienceMeta.module.css';

interface ExperienceMetaProps {
  experience: Experience;
  /** 준비물을 따로 보여주는 화면에서는 끈다 */
  showSupplies?: boolean;
}

/** 예상 시간 · 장소 · 비용 · 혼자 가능 여부 · 준비물 */
export function ExperienceMeta({ experience, showSupplies = true }: ExperienceMetaProps) {
  const { minutes, place, supplies, cost, solo } = experience;
  return (
    <ul className={styles.meta} aria-label="경험 정보">
      <li>{formatMinutes(minutes)}</li>
      <li>{PLACE_LABELS[place]}</li>
      {cost && <li>{COST_LABELS[cost]}</li>}
      {solo && <li>혼자 가능</li>}
      {showSupplies && <li>{supplies.length ? `준비물 · ${supplies.join(', ')}` : '준비물 없음'}</li>}
    </ul>
  );
}
