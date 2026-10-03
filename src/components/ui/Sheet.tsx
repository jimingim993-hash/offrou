import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Sheet.module.css';

interface SheetProps {
  title: string;
  description?: string;
  onClose: () => void;
  /** 버튼 영역 */
  children: ReactNode;
}

/**
 * 아래에서 올라오는 작은 확인 시트 (모바일) / 가운데 대화상자 (PC).
 * 화면 전환 애니메이션(transform)이 fixed 위치를 가두지 않도록 body에 portal로 그린다.
 */
export function Sheet({ title, description, onClose, children }: SheetProps) {
  const titleId = useId();
  const actions = useRef<HTMLDivElement>(null);

  useEffect(() => {
    actions.current?.querySelector('button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {description && <p className={styles.text}>{description}</p>}
        <div ref={actions} className={styles.actions}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 시트 안의 조용한 텍스트 버튼 (그만두기·계속하기) */
export function SheetQuietButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={styles.quiet} onClick={onClick}>
      {children}
    </button>
  );
}
