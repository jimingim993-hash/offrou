import type { InteractiveStory } from '@/types/story';

export const CITY_GUIDE_STORY: InteractiveStory = {
  experienceId: 'exp-city-guide',
  title: '오늘은 도시 안내자',
  subtitle: '처음 온 손님에게 하루를 보여줄 차례',
  introduction: '오늘 너는 상상 속 바닷가 도시의 안내자야. 처음 온 여행자에게 어디부터 보여줄까?',
  estimatedMinutes: 10,
  start: 'meet',
  completionMessage: '누군가에게 낯선 도시를 조금 익숙하게 만들어줬어.',
  scenes: [
    {
      id: 'meet',
      title: '역 앞에서',
      description: '여행자가 배낭을 메고 두리번거려. "어디부터 가면 좋을까요?"',
      choices: [
        { label: '아침 시장', next: 'market', flag: 'market' },
        { label: '언덕 위 공원', next: 'park', flag: 'park' },
      ],
    },
    {
      id: 'market',
      title: '아침 시장',
      description: '생선 가게 아주머니가 "처음 왔구나!" 하고 귤을 하나 쥐여줘.',
      choices: [
        { label: '시장 뒤 좁은 골목으로', next: 'alley', flag: 'alley' },
        { label: '바다가 보이는 방파제로', next: 'sea', flag: 'sea' },
      ],
    },
    {
      id: 'park',
      title: '언덕 위 공원',
      description: '도시 전체가 한눈에 보여. 여행자가 한참 말이 없어.',
      choices: [
        { label: '내려가는 길에 골목을 지난다', next: 'alley', flag: 'alley' },
        { label: '벤치에서 잠깐 쉬어 간다', next: 'sea', flag: 'rest' },
      ],
    },
    {
      id: 'alley',
      title: '골목',
      description: '벽화와 화분이 이어진 골목. 작은 찻집 하나가 보여.',
      choices: [{ label: '저녁이 된다', next: 'night' }],
    },
    {
      id: 'sea',
      title: '바닷가',
      description: '갈매기 소리. 여행자가 신발을 벗고 모래를 밟아봐.',
      choices: [{ label: '저녁이 된다', next: 'night' }],
    },
    {
      id: 'night',
      title: '야경',
      description: '하루의 마지막 장소를 골라.',
      choices: [
        { label: '불 켜진 다리 위', next: 'goodbye', flag: 'bridge' },
        { label: '항구의 작은 등대 앞', next: 'goodbye', flag: 'lighthouse' },
      ],
    },
    {
      id: 'goodbye',
      title: '배웅',
      description: '역으로 돌아오는 길. 여행자가 오늘 사진을 넘겨보며 웃어.',
      lines: [
        { if: 'market', text: '"그 귤, 아직 주머니에 있어요." 여행자가 꺼내 보였어.' },
        { if: 'park', text: '"언덕에서 본 풍경이 제일 오래 기억날 것 같아요."' },
        { if: 'lighthouse', text: '등대 불빛이 기차 창문까지 따라오는 것 같았대.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'local', when: ['market', 'alley'], title: '동네 사람처럼', message: '여행자에게 이 도시의 진짜 골목을 보여줬어.' },
    { id: 'view', when: ['park'], title: '한눈에 본 도시', message: '도시 전체를 선물처럼 보여줬어.' },
    { id: 'default', title: '안내자의 하루', message: '누군가에게 낯선 도시를 조금 익숙하게 만들어줬어.' },
  ],
};
