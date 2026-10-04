import { Chip } from '@/components/ui/Chip';
import { DURATIONS } from '@/data/durations';
import type { DiscoverFilter, PlaceFilter } from '@/services/discovery';
import styles from './DiscoverPage.module.css';

const TIMES = [
  { id: undefined, label: '전체' },
  ...DURATIONS.filter((d) => d.minutes !== null).map((d) => ({ id: d.id as DiscoverFilter['time'], label: d.label })),
];

const PLACES: { id: PlaceFilter; label: string }[] = [
  { id: 'any', label: '상관없어' },
  { id: 'home', label: '집에서' },
  { id: 'outside', label: '밖에서' },
];

interface FilterBarProps {
  time: DiscoverFilter['time'];
  place: PlaceFilter;
  onChange: (patch: Partial<Pick<DiscoverFilter, 'time' | 'place'>>) => void;
}

/** 시간·장소 두 가지만. 세부 옵션은 두지 않는다. */
export function FilterBar({ time, place, onChange }: FilterBarProps) {
  return (
    <div className={styles.filters}>
      <div className={styles.filterRow} role="group" aria-label="시간">
        <span className={styles.filterLabel} aria-hidden="true">
          시간
        </span>
        {TIMES.map((t) => (
          <Chip key={t.label} small label={t.label} selected={time === t.id} onSelect={() => onChange({ time: t.id })} />
        ))}
      </div>
      <div className={styles.filterRow} role="group" aria-label="장소">
        <span className={styles.filterLabel} aria-hidden="true">
          장소
        </span>
        {PLACES.map((p) => (
          <Chip key={p.id} small label={p.label} selected={place === p.id} onSelect={() => onChange({ place: p.id })} />
        ))}
      </div>
    </div>
  );
}
