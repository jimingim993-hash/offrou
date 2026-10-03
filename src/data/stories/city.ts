import type { InteractiveStory } from '@/types/story';

export const CITY_STORY: InteractiveStory = {
  experienceId: 'exp-strange-city',
  title: '낯선 도시의 하루',
  subtitle: '이름 모를 도시의 작은 기차역에서',
  introduction: '일정도, 해야 할 일도 없어. 발길 닿는 대로 하루를 보내면 돼.',
  estimatedMinutes: 10,
  start: 'station',
  completionMessage: '잠깐, 아무도 모르는 도시에 다녀왔어.',
  scenes: [
    {
      id: 'station',
      title: '기차역 도착',
      description: '이름 모를 도시의 작은 기차역. 표지판 글자는 낯설고, 정해진 일정은 없어.',
      lines: [{ text: '어디로 가볼까?' }],
      choices: [
        { label: '좁은 골목길', next: 'meet', flag: 'alley' },
        { label: '북적이는 시장', next: 'meet', flag: 'market' },
        { label: '강가 산책로', next: 'meet', flag: 'river' },
      ],
    },
    {
      id: 'meet',
      title: '뜻밖의 만남',
      description: '걷다 보니 누군가 너에게 말을 걸어.',
      lines: [
        { if: 'alley', text: '골목 끝 공방에서 할아버지가 손짓해. "나무 숟가락 깎는 거, 구경할래요?"' },
        { if: 'market', text: '과일 가게 주인이 처음 보는 과일을 내밀어. "맛봐요. 이 동네에서만 나요."' },
        { if: 'river', text: '강가 벤치의 화가가 스케치북을 보여줘. "여기 풍경, 같이 그려볼래요?"' },
      ],
      choices: [
        { label: '잠깐 같이 해본다', next: 'afternoon', flag: 'join' },
        { label: '고맙다고 인사하고 계속 걷는다', next: 'afternoon', flag: 'walk' },
      ],
    },
    {
      id: 'afternoon',
      title: '오후',
      description: '해가 조금씩 기울기 시작해. 어디서 저녁을 맞을까?',
      lines: [
        { if: 'join', text: '한참을 함께 보냈어. 헤어질 때 작은 선물을 받았지. 오늘 이 도시의 기념품이야.' },
        { if: 'walk', text: '인사를 나누고 다시 걸었어. 처음 보는 모퉁이를 몇 번 더 돌았지.' },
      ],
      choices: [
        { label: '언덕 위 전망대', next: 'evening', flag: 'hill' },
        { label: '작은 식당의 창가 자리', next: 'evening', flag: 'diner' },
      ],
    },
    {
      id: 'evening',
      title: '저녁',
      description: '하루가 거의 끝나가.',
      lines: [
        { if: 'hill', text: '도시의 불빛이 하나둘 켜져. 이름도 모르는 동네가 반짝이기 시작해.' },
        { if: 'diner', text: '따뜻한 수프가 나와. 옆 테이블의 웃음소리가 더는 낯설지 않아.' },
      ],
      next: 'farewell',
    },
    {
      id: 'farewell',
      title: '도시에서의 하루',
      description: '기차역으로 돌아가는 길, 오늘 하루를 떠올려.',
      lines: [
        { if: 'alley', text: '나무 냄새가 아직 손끝에 남아 있는 것 같아.' },
        { if: 'market', text: '처음 먹어본 새콤한 맛이 아직 입안에 맴돌아.' },
        { if: 'river', text: '강물 위로 반짝이던 오후 햇빛이 눈앞에 선해.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'alley', when: ['alley'], title: '골목에서 보낸 하루', message: '낯선 골목이 오늘 하루를 조용히 품어줬어.' },
    { id: 'market', when: ['market'], title: '시장의 맛이 남은 하루', message: '처음 가본 도시에 맛 하나가 기억으로 남았어.' },
    { id: 'river', when: ['river'], title: '강가에서 보낸 하루', message: '강물처럼 천천히 흘러간 하루였어.' },
    { id: 'default', title: '낯선 도시의 하루', message: '잠깐, 아무도 모르는 도시에 다녀왔어.' },
  ],
};
