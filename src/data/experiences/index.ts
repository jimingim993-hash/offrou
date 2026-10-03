import type { Experience } from '@/types/offrou';
import { REST_EXPERIENCES } from './rest';
import { PLAY_EXPERIENCES } from './play';
import { HOBBY_EXPERIENCES } from './hobby';
import { EXPERIENCE_EXPERIENCES } from './experience';
import { OUT_EXPERIENCES } from './out';

/** 정적 경험 콘텐츠. 화면에서는 직접 쓰지 말고 services/experiences를 통해 조회한다. */
export const EXPERIENCES: Experience[] = [
  ...REST_EXPERIENCES,
  ...PLAY_EXPERIENCES,
  ...HOBBY_EXPERIENCES,
  ...EXPERIENCE_EXPERIENCES,
  ...OUT_EXPERIENCES,
];
