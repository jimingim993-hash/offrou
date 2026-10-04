import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { isDefaultFilter, pickRandom, searchExperiences } from '@/services/discovery';
import { experiencePath } from '@/features/experience/paths';
import { useDiscoverFilter } from './useDiscoverFilter';
import { SearchBox } from './SearchBox';
import { CategoryTabs } from './CategoryTabs';
import { FilterBar } from './FilterBar';
import { ResultList } from './ResultList';
import { NoResults } from './NoResults';
import { FirstMeet } from './FirstMeet';
import { RecentViewed } from './RecentViewed';
import styles from './DiscoverPage.module.css';

/**
 * 발견: 사용자가 직접 골라보는 공간.
 * 검색·필터는 가볍게, 결과는 조금씩(더 보기) 보여줘 선택 피로를 줄인다.
 */
export function DiscoverPage() {
  const navigate = useNavigate();
  const { filter, update, search, invalidCategory } = useDiscoverFilter();
  const results = useMemo(() => searchExperiences(filter), [filter]);
  // 조건이 바뀌면 목록·제안을 새로 시작한다
  const filterKey = `${filter.category ?? ''}|${filter.q}|${filter.time ?? ''}|${filter.place}`;

  if (invalidCategory) return <Navigate to={`/app/discover${search}`} replace />;

  const random = () => {
    const pick = pickRandom(results);
    if (pick) navigate(experiencePath(pick.id));
  };

  return (
    <div className={styles.discover}>
      <PageHeader eyebrow="DISCOVER" title="어떤 시간을 보내볼까?" description="오늘은 직접 골라보고 싶을 때." />

      <div className={styles.controls}>
        <SearchBox value={filter.q} onChange={(q) => update({ q })} />
        <CategoryTabs active={filter.category} search={search} />
        <FilterBar time={filter.time} place={filter.place} onChange={update} />
      </div>

      <div className={styles.toolbar}>
        <p className={styles.count} aria-live="polite">
          {results.length > 0 ? `${results.length}개의 시간` : '맞는 시간이 없어'}
        </p>
        <button type="button" className={styles.random} onClick={random} disabled={results.length === 0}>
          <span aria-hidden="true">🎲</span> 아무거나 하나
        </button>
      </div>

      {/* 아무 조건 없이 둘러볼 때만, 하나만 */}
      {isDefaultFilter(filter) && <FirstMeet list={results} />}

      {results.length > 0 ? (
        <ResultList key={`list-${filterKey}`} items={results} />
      ) : (
        <NoResults key={`none-${filterKey}`} filter={filter} onClear={() => navigate('/app/discover', { replace: true })} />
      )}

      <RecentViewed />
    </div>
  );
}
