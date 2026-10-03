import type { Category } from '@/types/offrou';

export const CATEGORIES: Category[] = [
  { id: 'rest', code: 'REST', name: '쉬기', tagline: '아무것도 안 해도 괜찮은 시간', symbol: '☁️' },
  { id: 'play', code: 'PLAY', name: '놀기', tagline: '잠깐 가볍게 즐기는 시간', symbol: '🪁' },
  { id: 'hobby', code: 'HOBBY', name: '취미 맛보기', tagline: '부담 없이 한 입만', symbol: '🎨' },
  { id: 'experience', code: 'EXPERIENCE', name: '새로운 경험', tagline: '다른 삶을 짧게 살아보기', symbol: '🎭' },
  { id: 'out', code: 'OUT', name: '밖에서', tagline: '문 밖의 새로운 시간', symbol: '🌿' },
];
