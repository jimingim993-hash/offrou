import { useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CATEGORIES } from '@/data/categories';
import { DURATIONS } from '@/data/durations';
import type { DiscoverFilter, PlaceFilter } from '@/services/discovery';

const TIME_IDS = DURATIONS.filter((d) => d.minutes !== null).map((d) => d.id);
const PLACES: PlaceFilter[] = ['any', 'home', 'outside'];

/**
 * 발견 필터 상태는 URL에 둔다 → 새로고침·뒤로 가기·공유해도 그대로.
 * 카테고리: /discover/:categoryId, 나머지: ?q=&time=&place=
 */
export function useDiscoverFilter() {
  const { categoryId } = useParams();
  const [params, setParams] = useSearchParams();
  const category = CATEGORIES.find((c) => c.id === categoryId);

  const q = params.get('q') ?? '';
  const timeParam = params.get('time');
  const placeParam = params.get('place');

  const filter = useMemo<DiscoverFilter>(
    () => ({
      q,
      category: category?.id,
      time: TIME_IDS.find((t) => t === timeParam) as DiscoverFilter['time'],
      place: PLACES.find((p) => p === placeParam) ?? 'any',
    }),
    [q, category, timeParam, placeParam],
  );

  /** 검색어·시간·장소 변경 (기본값이면 URL에서 뺀다) */
  const update = useCallback(
    (patch: Partial<Pick<DiscoverFilter, 'q' | 'time' | 'place'>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const set = (key: string, value: string | undefined, empty: string) => {
            if (value === undefined) return;
            if (value === empty) next.delete(key);
            else next.set(key, value);
          };
          set('q', patch.q, '');
          if ('time' in patch) set('time', patch.time ?? '', '');
          set('place', patch.place, 'any');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return {
    filter,
    update,
    /** 카테고리 링크에 붙일 현재 검색 조건 */
    search: params.toString() ? `?${params.toString()}` : '',
    invalidCategory: categoryId !== undefined && !category,
  };
}
