import { EXPERIENCES } from '@/data/experiences';
import { STORIES } from '@/data/stories';
import type { CategoryId, Experience } from '@/types/offrou';
import type { InteractiveStory } from '@/types/story';

/**
 * 경험 콘텐츠 조회 레이어.
 * 지금은 로컬 정적 데이터(src/data/experiences)를 읽는다.
 * 화면은 이 함수들만 사용하므로, 이후 API로 바꿀 때는 여기만 교체(필요하면 async로 전환)한다.
 */
export function listExperiences(): Experience[] {
  return EXPERIENCES;
}

export function getExperience(id: string | undefined): Experience | undefined {
  return EXPERIENCES.find((e) => e.id === id);
}

export function getExperiencesByCategory(categoryId: CategoryId): Experience[] {
  return EXPERIENCES.filter((e) => e.categoryId === categoryId);
}

/** 인터랙티브 EXPERIENCE 장면 데이터 */
export function getStory(storyId: string | undefined): InteractiveStory | undefined {
  return STORIES.find((s) => s.experienceId === storyId);
}
