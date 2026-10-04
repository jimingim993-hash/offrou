import styles from './Chip.module.css';

interface ChipProps {
  label: string;
  selected?: boolean;
  onSelect: () => void;
  /** 필터처럼 여러 개를 나란히 둘 때 쓰는 조금 작은 크기 (터치 영역 44px 유지) */
  small?: boolean;
}

/** 시간 선택 등 짧은 옵션용 칩 */
export function Chip({ label, selected = false, onSelect, small = false }: ChipProps) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${selected ? styles.selected : ''} ${small ? styles.small : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}
