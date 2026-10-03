import type { InteractiveStory } from '@/types/story';
import { BOOKSTORE_STORY } from './bookstore';
import { RADIO_STORY } from './radio';
import { HOTEL_STORY } from './hotel';
import { DETECTIVE_STORY } from './detective';
import { CITY_STORY } from './city';

/** 인터랙티브 EXPERIENCE 장면 데이터. 새 이야기는 파일을 만들고 여기에 등록한다. */
export const STORIES: InteractiveStory[] = [BOOKSTORE_STORY, RADIO_STORY, HOTEL_STORY, DETECTIVE_STORY, CITY_STORY];
