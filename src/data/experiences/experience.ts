import type { Experience } from '@/types/offrou';
import type { InteractiveStory } from '@/types/story';
import { STORIES } from '@/data/stories';

const STORY_STEPS = [
  '장면을 하나씩 읽고, 그 사람이 되었다고 생각해봐.',
  '선택지가 나오면 마음 가는 쪽을 골라.',
  '언제든 나가도 괜찮아.',
];

type StoryMeta = Pick<Experience, 'invite' | 'summary' | 'symbol' | 'tags'>;

/** 이야기 데이터에서 제목·시간·완료 메시지를 가져와 경험 메타데이터를 만든다 (중복 방지) */
const fromStory = (story: InteractiveStory, meta: StoryMeta): Experience => ({
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
  tags: ['이야기', '역할', '상상', '실내', ...meta.tags],
});

/** 경험 id → 추천·탐색용 메타데이터. 장면 데이터는 src/data/stories에 있다. */
const META: Record<string, StoryMeta> = {
  'exp-bookstore': {
    symbol: '📚',
    invite: '오늘은 골목 끝 작은 서점의 주인이 되어봐.',
    summary: '손님들에게 어울리는 책을 건네며 보내는 서점의 하루.',
    tags: ['책', '가게', '손님', '비', '조용함'],
  },
  'exp-radio-dj': {
    symbol: '📻',
    invite: '오늘 밤은 심야 라디오 DJ가 되어봐.',
    summary: '오늘 밤 잠깐 누군가의 사연을 받아볼래?',
    tags: ['밤', '음악', '사연', '라디오', '혼자', '조용함'],
  },
  'exp-small-hotel': {
    symbol: '🏨',
    invite: '바닷가 작은 호텔의 하루를 맡아봐.',
    summary: '방이 다섯 개뿐인 호텔에서 손님을 맞고 작은 부탁을 들어주는 하루.',
    tags: ['바다', '여행', '손님', '호텔'],
  },
  'exp-detective': {
    symbol: '🔍',
    invite: '오늘은 동네 탐정이 되어 작은 사건을 풀어봐.',
    summary: '카페에서 바뀐 똑같은 가방 두 개. 단서로 주인을 찾아줘.',
    tags: ['추리', '미스터리', '탐정', '카페', '짧게'],
  },
  'exp-strange-city': {
    symbol: '🚉',
    invite: '처음 가보는 도시에서 하루를 보내봐.',
    summary: '이름 모를 도시의 기차역에서 시작하는, 계획 없는 하루.',
    tags: ['여행', '도시', '낯선', '산책', '시장'],
  },
  'exp-last-cafe': {
    symbol: '☕',
    invite: '마감 직전, 작은 카페의 마지막 손님을 맞아봐.',
    summary: '비 오는 밤, 바리스타가 되어 따뜻한 한 잔을 건네는 시간.',
    tags: ['카페', '밤', '비', '음료', '손님', '조용함'],
  },
  'exp-flower-shop': {
    symbol: '💐',
    invite: '오늘 하루, 동네 꽃집을 맡아봐.',
    summary: '손님마다 마음에 맞는 꽃을 골라 건네는 꽃집의 하루.',
    tags: ['꽃', '가게', '손님', '선물'],
  },
  'exp-night-train': {
    symbol: '🚆',
    invite: '바다로 가는 늦은 밤 기차에 올라타 봐.',
    summary: '창가 자리에 앉아 흔들리는 밤을 지나가는 짧은 여행.',
    tags: ['밤', '기차', '여행', '바다', '혼자', '조용함'],
  },
  'exp-museum-night': {
    symbol: '🏛️',
    invite: '관람객이 떠난 작은 박물관의 밤을 지켜봐.',
    summary: '손전등 하나 들고 조용한 전시실을 한 바퀴 도는 야간 순찰.',
    tags: ['밤', '박물관', '그림', '전시', '조용함'],
  },
  'exp-postman': {
    symbol: '✉️',
    invite: '오늘은 마을 우체부가 되어 편지를 전해봐.',
    summary: '가방 속 편지 세 통을 주인에게 전하는 오래된 마을의 하루.',
    tags: ['편지', '마을', '산책', '선물'],
  },
};

export const EXPERIENCE_EXPERIENCES: Experience[] = STORIES.map((story) => {
  const meta = META[story.experienceId];
  if (!meta) throw new Error(`이야기 메타데이터 없음: ${story.experienceId}`);
  return fromStory(story, meta);
});
