import type { InteractiveStory } from '@/types/story';
import { BOOKSTORE_STORY } from './bookstore';
import { RADIO_STORY } from './radio';
import { HOTEL_STORY } from './hotel';
import { DETECTIVE_STORY } from './detective';
import { CITY_STORY } from './city';
import { CAFE_STORY } from './cafe';
import { FLOWER_SHOP_STORY } from './flower-shop';
import { NIGHT_TRAIN_STORY } from './night-train';
import { MUSEUM_NIGHT_STORY } from './museum-night';
import { POSTMAN_STORY } from './postman';

/** 인터랙티브 EXPERIENCE 장면 데이터. 새 이야기는 파일을 만들고 여기에 등록한다. */
export const STORIES: InteractiveStory[] = [
  BOOKSTORE_STORY,
  RADIO_STORY,
  HOTEL_STORY,
  DETECTIVE_STORY,
  CITY_STORY,
  CAFE_STORY,
  FLOWER_SHOP_STORY,
  NIGHT_TRAIN_STORY,
  MUSEUM_NIGHT_STORY,
  POSTMAN_STORY,
];
