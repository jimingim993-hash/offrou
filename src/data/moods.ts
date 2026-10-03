import type { Mood, MoodId } from '@/types/offrou';

export const MOODS: Mood[] = [
  { id: 'rest', label: '쉬고 싶어', symbol: '☁️' },
  { id: 'anything', label: '아무거나 해볼래', symbol: '🎲' },
  { id: 'new', label: '새로운 걸 해보고 싶어', symbol: '🌱' },
  { id: 'play', label: '잠깐 놀고 싶어', symbol: '🪁' },
  { id: 'out', label: '밖에 나가고 싶어', symbol: '🚶' },
  { id: 'bedtime', label: '자기 전에 들어왔어', symbol: '🌙' },
];

export const findMood = (id: string | null | undefined) =>
  MOODS.find((m) => m.id === (id as MoodId));
