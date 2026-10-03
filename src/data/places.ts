import type { CostLevel, PlaceId } from '@/types/offrou';

export const PLACE_LABELS: Record<PlaceId, string> = {
  home: '집에서도 가능',
  anywhere: '어디서나',
  outside: '밖에서',
};

export const COST_LABELS: Record<CostLevel, string> = {
  free: '비용 없음',
  low: '비용 조금',
};
