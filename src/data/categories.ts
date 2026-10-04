import type { Category } from '@/types/offrou';

export const CATEGORIES: Category[] = [
  { id: 'rest', code: 'REST', short: '쉬어가는 시간', intro: '아무것도 열심히 하지 않아도 되는 시간.', name: '쉬기', tagline: '아무것도 안 해도 괜찮은 시간', symbol: '☁️' },
  { id: 'play', code: 'PLAY', short: '가볍게 노는 시간', intro: '몇 분만 있어도 시작할 수 있는 작은 재미.', name: '놀기', tagline: '잠깐 가볍게 즐기는 시간', symbol: '🪁' },
  { id: 'hobby', code: 'HOBBY', short: '새로운 걸 맛보는 시간', intro: '취미를 시작하기 전에 부담 없이 한번 경험해보는 시간.', name: '취미 맛보기', tagline: '부담 없이 한 입만', symbol: '🎨' },
  { id: 'experience', code: 'EXPERIENCE', short: '다른 하루를 살아보는 시간', intro: '서점 주인, 심야 라디오 DJ, 탐정처럼 평소와 다른 역할과 상황을 잠깐 경험하는 시간.', name: '새로운 경험', tagline: '다른 삶을 짧게 살아보기', symbol: '🎭' },
  { id: 'out', code: 'OUT', short: '밖으로 나가는 시간', intro: '평소 가지 않던 길, 새로운 장소, 작은 외출을 시작하는 시간.', name: '밖에서', tagline: '문 밖의 새로운 시간', symbol: '🌿' },
];
