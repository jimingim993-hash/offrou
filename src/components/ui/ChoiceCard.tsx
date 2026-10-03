import styles from './ChoiceCard.module.css';

interface ChoiceCardProps {
  label: string;
  symbol?: string;
  selected?: boolean;
  onSelect: () => void;
}

/** HOME의 "지금 어떤 시간이 필요해?" 큰 선택 카드 */
export function ChoiceCard({ label, symbol, selected = false, onSelect }: ChoiceCardProps) {
  return (
    <button
      type="button"
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {symbol && (
        <span className={styles.symbol} aria-hidden="true">
          {symbol}
        </span>
      )}
      <span className={styles.label}>{label}</span>
    </button>
  );
}
