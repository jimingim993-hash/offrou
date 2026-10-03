import { useStoreVersion } from '@/hooks/useStoreVersion';
import { isSaved, toggleSaved } from '@/services/saved';
import styles from './SaveButton.module.css';

interface SaveButtonProps {
  experienceId: string;
  /** 목록 안에서 쓰는 작은 아이콘 버튼 */
  compact?: boolean;
  /** 접근성 이름에 붙일 경험 제목 */
  title?: string;
}

/** ♡ 저장 — 나중에 해보고 싶은 시간을 이 기기에 남긴다 */
export function SaveButton({ experienceId, compact = false, title }: SaveButtonProps) {
  useStoreVersion();
  const saved = isSaved(experienceId);
  const label = saved ? '저장됨' : '저장';

  return (
    <button
      type="button"
      className={`${styles.save} ${compact ? styles.compact : ''} ${saved ? styles.on : ''}`}
      aria-pressed={saved}
      aria-label={title ? `${title} ${label}` : undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved(experienceId);
      }}
    >
      <span aria-hidden="true">{saved ? '♥' : '♡'}</span>
      {!compact && <span>{label}</span>}
    </button>
  );
}
