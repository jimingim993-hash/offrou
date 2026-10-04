import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_BASE } from '@/app/paths';
import styles from './site.module.css';

export const SITE_NAV = [
  { href: '#service', label: '서비스' },
  { href: '#times', label: '경험' },
  { href: '#brand', label: '브랜드' },
  { href: '#contact', label: '문의' },
];

/** PC: 간결한 메뉴 + 시작 버튼 · 모바일: 시작 버튼 + 메뉴 열기 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={`${styles.container} ${styles.headerInner}`}>
        <a href="#top" className={styles.wordmark} aria-label="OFFROU 맨 위로">
          <span className={styles.wordmarkDot} aria-hidden="true" />
          OFFROU
        </a>

        <nav aria-label="홈페이지" className={styles.nav}>
          <ul>
            {SITE_NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.headerActions}>
          <Link to={APP_BASE} className={styles.headerCta}>
            OFFROU 시작하기
          </Link>
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden="true">{open ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {open && (
        <nav id="site-menu" aria-label="홈페이지 메뉴" className={styles.mobileMenu}>
          <ul className={styles.container}>
            {SITE_NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
