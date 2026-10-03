import type { DurationId, DurationOption } from '@/types/offrou';

export const DURATIONS: DurationOption[] = [
  { id: '5m', label: '5분', minutes: 5 },
  { id: '10m', label: '10분', minutes: 10 },
  { id: '30m', label: '30분', minutes: 30 },
  { id: '1h', label: '1시간', minutes: 60 },
  { id: 'any', label: '상관없어', minutes: null },
];

export const findDuration = (id: string | null | undefined) =>
  DURATIONS.find((d) => d.id === (id as DurationId));

/** 경험 소요 시간 표시용: 15 → "15분", 60 → "1시간" */
export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h}시간`, m && `${m}분`].filter(Boolean).join(' ');
};

/** 예상 시간 표시용: 8 → "약 8분" */
export const formatMinutes = (minutes: number) => `약 ${formatDuration(minutes)}`;
