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
  'exp-last-screening': {
    symbol: '🎞️',
    invite: '작은 영화관의 마지막 상영을 준비해봐.',
    summary: '포스터를 걸고 손님을 맞고 불을 낮추는, 좌석 마흔 개 영화관의 밤.',
    tags: ['영화', '밤', '손님', '극장'],
  },
  'exp-dawn-store': {
    symbol: '🏪',
    invite: '새벽 3시, 조용한 편의점을 잠깐 맡아봐.',
    summary: '진열대, 골목 고양이, 캔커피 하나. 새벽 가게의 짧은 시간.',
    tags: ['새벽', '가게', '손님', '조용함', '짧게'],
  },
  'exp-magazine-editor': {
    symbol: '📰',
    invite: '오늘 하루 작은 동네 잡지의 편집자가 되어봐.',
    summary: '표지 주제, 첫 페이지, 사진 분위기, 마지막 문장을 고르는 마감 날.',
    tags: ['잡지', '편집', '사진', '글'],
  },
  'exp-photographer': {
    symbol: '📷',
    invite: '오늘만 사진작가가 되어 동네의 오후를 찍어봐.',
    summary: '장소와 빛, 구도를 골라 상상 속 사진 한 장을 완성하는 의뢰.',
    tags: ['사진', '빛', '동네', '짧게'],
  },
  'exp-observatory': {
    symbol: '🔭',
    invite: '언덕 위 작은 천문대에서 밤을 보내봐.',
    summary: '관측 대상을 고르고 방문객과 이야기하며 맑은 밤을 지키는 시간.',
    tags: ['밤', '별', '하늘', '천문대', '조용함'],
  },
  'exp-book-designer': {
    symbol: '📕',
    invite: '하루 동안 북디자이너가 되어 표지를 만들어봐.',
    summary: '분위기, 제목 위치, 색을 골라 책 한 권의 얼굴을 정하는 시간.',
    tags: ['책', '디자인', '표지', '색', '짧게'],
  },
  'exp-plant-shop': {
    symbol: '🪴',
    invite: '작은 식물가게를 맡아 손님에게 어울리는 화분을 골라봐.',
    summary: '이사 온 손님, 선물을 찾는 손님. 초록을 하나씩 떠나보내는 하루.',
    tags: ['식물', '가게', '손님', '선물'],
  },
  'exp-alley-bakery': {
    symbol: '🥐',
    invite: '골목 작은 빵집의 하루를 맡아봐.',
    summary: '오늘의 빵을 고르고, 첫 손님과 마지막 남은 빵까지 함께하는 하루.',
    tags: ['빵', '가게', '아침', '손님', '골목'],
  },
  'exp-small-stage': {
    symbol: '🎻',
    invite: '작은 공연장의 오늘 밤 공연을 준비해봐.',
    summary: '의자, 조명, 관객 입장, 공연 직전의 대기실까지. 무대 뒤의 하루.',
    tags: ['공연', '음악', '무대', '밤'],
  },
  'exp-city-guide': {
    symbol: '🗺️',
    invite: '처음 온 여행자에게 상상 속 도시를 안내해봐.',
    summary: '시장, 공원, 골목, 야경. 어디부터 보여줄지 고르는 안내자의 하루.',
    tags: ['여행', '도시', '안내', '바다', '산책'],
  },
};

export const EXPERIENCE_EXPERIENCES: Experience[] = STORIES.map((story) => {
  const meta = META[story.experienceId];
  if (!meta) throw new Error(`이야기 메타데이터 없음: ${story.experienceId}`);
  return fromStory(story, meta);
});
