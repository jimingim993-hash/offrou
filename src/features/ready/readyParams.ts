import { findMood } from '@/data/moods';
import { findDuration } from '@/data/durations';
import type { DurationId, MoodId, RecommendMode } from '@/types/offrou';

/**
 * 선택값과 현재 추천(pick), 추천 모드(fresh)를 URL 쿼리로 전달한다.
 * → 새로고침/공유해도 같은 추천이 유지된다.
 */
export const readySearch = (mood: MoodId, duration: DurationId, pick?: string, mode: RecommendMode = 'usual') =>
  new URLSearchParams({ mood, time: duration, ...(pick && { pick }), ...(mode === 'fresh' && { fresh: '1' }) });

export const buildReadyPath = (mood: MoodId, duration: DurationId) =>
  `/ready?${readySearch(mood, duration).toString()}`;

export const parseReadyParams = (params: URLSearchParams) => ({
  mood: findMood(params.get('mood')),
  duration: findDuration(params.get('time')),
  pickId: params.get('pick'),
  mode: (params.get('fresh') === '1' ? 'fresh' : 'usual') as RecommendMode,
});
