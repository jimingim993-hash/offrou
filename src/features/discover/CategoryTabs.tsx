import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '@/data/categories';
import type { CategoryId } from '@/types/offrou';
import styles from './DiscoverPage.module.css';

interface CategoryTabsProps {
  active?: CategoryId;
  /** 현재 검색·시간·장소 조건 (카테고리를 바꿔도 유지) */
  search: string;
}

const TABS = [
  { id: undefined, code: '전체', short: '모든 시간', symbol: '✦' },
  ...CATEGORIES.map((c) => ({ id: c.id, code: c.code, short: c.short, symbol: c.symbol })),
];

/** 카테고리: 영문 코드와 한글 설명을 함께 */
export function CategoryTabs({ active, search }: CategoryTabsProps) {
  const list = useRef<HTMLUListElement>(null);

  // 모바일 가로 스크롤에서 선택한 카테고리가 보이도록
  useEffect(() => {
    list.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [active]);

  return (
    <nav aria-label="카테고리">
      <ul ref={list} className={styles.categories}>
        {TABS.map((t) => {
          const current = t.id === active;
          return (
            <li key={t.code}>
              <Link
                to={`/app/discover${t.id ? `/${t.id}` : ''}${search}`}
                replace
                className={`${styles.category} ${current ? styles.categoryOn : ''}`}
                aria-current={current ? 'page' : undefined}
              >
                <span className={styles.categoryHead}>
                  <span aria-hidden="true">{t.symbol}</span>
                  <span className={styles.categoryCode}>{t.code}</span>
                </span>
                <span className={styles.categoryShort}>{t.short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
