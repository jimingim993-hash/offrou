import type { CategoryId } from '@/types/offrou';

/** 작은 OFFROU 코스 — 전체 시간과 분위기. 코스 자체는 기존 경험을 이어 붙여 만든다. */
export const COURSE_MINUTES = [20, 30, 60] as const;
export type CourseMinutes = (typeof COURSE_MINUTES)[number];

export type CourseVibe = 'calm' | 'fun' | 'new' | 'out' | 'any';

export interface CourseVibeInfo {
  id: CourseVibe;
  label: string;
  description: string;
  symbol: string;
  /** 중심 카테고리 */
  primary: CategoryId[];
  /** 한 개까지 섞을 수 있는 카테고리 (흐름을 부드럽게) */
  secondary: CategoryId[];
}

export const COURSE_VIBES: CourseVibeInfo[] = [
  { id: 'calm', label: '편하게', description: '쉬어가는 시간 위주로', symbol: '☁️', primary: ['rest'], secondary: ['hobby'] },
  { id: 'fun', label: '재밌게', description: '가볍게 노는 시간 위주로', symbol: '🪁', primary: ['play'], secondary: ['hobby', 'experience'] },
  { id: 'new', label: '새롭게', description: '처음 해보는 취미와 이야기', symbol: '🌱', primary: ['hobby', 'experience'], secondary: ['play'] },
  { id: 'out', label: '밖으로', description: '문 밖의 시간 위주로', symbol: '🚶', primary: ['out'], secondary: ['rest'] },
  {
    id: 'any',
    label: '아무거나',
    description: '이것저것 섞어서',
    symbol: '🎲',
    primary: ['rest', 'play', 'hobby', 'experience', 'out'],
    secondary: [],
  },
];

export const findVibe = (id: string | null | undefined) => COURSE_VIBES.find((v) => v.id === id);

export const isCourseMinutes = (n: number): n is CourseMinutes => (COURSE_MINUTES as readonly number[]).includes(n);

/** 코스 이름 템플릿 (분위기 × 시간). 같은 코스는 항상 같은 이름이 되도록 경험 구성으로 고른다. */
export const COURSE_TITLES: Record<CourseVibe, Record<CourseMinutes, string[]>> = {
  calm: {
    20: ['조용한 20분', '숨 고르는 20분'],
    30: ['느긋한 30분', '천천히 쉬어가는 30분'],
    60: ['천천히 쉬어가는 한 시간', '아무 일 없는 한 시간'],
  },
  fun: {
    20: ['가볍게 노는 20분', '잠깐 장난스러운 20분'],
    30: ['가볍게 노는 시간', '조금 신나는 30분'],
    60: ['실컷 노는 한 시간', '놀이로 채운 한 시간'],
  },
  new: {
    20: ['처음 해보는 20분', '살짝 맛보는 20분'],
    30: ['조금 다른 30분', '새로운 걸 맛보는 30분'],
    60: ['새로운 걸 맛보는 한 시간', '다른 하루 같은 한 시간'],
  },
  out: {
    20: ['잠깐 밖으로', '문 밖의 20분'],
    30: ['바람 쐬는 30분', '잠깐 밖으로'],
    60: ['바깥에서 보내는 한 시간', '천천히 걷는 한 시간'],
  },
  any: {
    20: ['이것저것 20분', '조금 다른 20분'],
    30: ['조금 다른 30분', '이것저것 30분'],
    60: ['뒤섞인 한 시간', '조금 다른 한 시간'],
  },
};
