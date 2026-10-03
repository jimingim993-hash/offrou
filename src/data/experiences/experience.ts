import type { Experience } from '@/types/offrou';
import type { InteractiveStory } from '@/types/story';
import { BOOKSTORE_STORY } from '@/data/stories/bookstore';
import { RADIO_STORY } from '@/data/stories/radio';
import { HOTEL_STORY } from '@/data/stories/hotel';
import { DETECTIVE_STORY } from '@/data/stories/detective';
import { CITY_STORY } from '@/data/stories/city';

const STORY_STEPS = [
  '장면을 하나씩 읽고, 그 사람이 되었다고 생각해봐.',
  '선택지가 나오면 마음 가는 쪽을 골라.',
  '언제든 나가도 괜찮아.',
];

/** 이야기 데이터에서 제목·시간·완료 메시지를 가져와 경험 메타데이터를 만든다 (중복 방지) */
const fromStory = (
  story: InteractiveStory,
  meta: Pick<Experience, 'invite' | 'summary' | 'symbol'>,
): Experience => ({
  id: story.experienceId,
  categoryId: 'experience',
  title: story.title,
  minutes: story.estimatedMinutes,
  doneMessage: story.completionMessage,
  moods: ['new'],
  place: 'anywhere',
  supplies: [],
  steps: STORY_STEPS,
  interaction: { type: 'story', storyId: story.experienceId },
  ...meta,
});

export const EXPERIENCE_EXPERIENCES: Experience[] = [
  fromStory(BOOKSTORE_STORY, {
    symbol: '📚',
    invite: '오늘은 골목 끝 작은 서점의 주인이 되어봐.',
    summary: '손님들에게 어울리는 책을 건네며 보내는 서점의 하루.',
  }),
  fromStory(RADIO_STORY, {
    symbol: '📻',
    invite: '오늘 밤은 심야 라디오 DJ가 되어봐.',
    summary: '새벽 1시, 사연을 읽고 음악을 고르고 멘트를 건네는 짧은 방송.',
  }),
  fromStory(HOTEL_STORY, {
    symbol: '🏨',
    invite: '바닷가 작은 호텔의 하루를 맡아봐.',
    summary: '방이 다섯 개뿐인 호텔에서 손님을 맞고 작은 부탁을 들어주는 하루.',
  }),
  fromStory(DETECTIVE_STORY, {
    symbol: '🔍',
    invite: '오늘은 동네 탐정이 되어 작은 사건을 풀어봐.',
    summary: '카페에서 바뀐 똑같은 가방 두 개. 단서로 주인을 찾아줘.',
  }),
  fromStory(CITY_STORY, {
    symbol: '🚉',
    invite: '처음 가보는 도시에서 하루를 보내봐.',
    summary: '이름 모를 도시의 기차역에서 시작하는, 계획 없는 하루.',
  }),
];
