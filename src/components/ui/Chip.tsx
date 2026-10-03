import styles from './Chip.module.css';

interface ChipProps {
  label: string;
  selected?: boolean;
  onSelect: () => void;
}

/** 시간 선택 등 짧은 옵션용 칩 */
export function Chip({ label, selected = false, onSelect }: ChipProps) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${selected ? styles.selected : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}
