import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  symbol?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

export function EmptyState({ symbol, title, description, children }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      {symbol && (
        <span className={styles.symbol} aria-hidden="true">
          {symbol}
        </span>
      )}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  );
}
