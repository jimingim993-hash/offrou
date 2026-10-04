import type { InteractiveStory } from '@/types/story';

export const PHOTOGRAPHER_STORY: InteractiveStory = {
  experienceId: 'exp-photographer',
  title: '오늘만 사진작가',
  subtitle: '의뢰 한 건: "우리 동네의 오후를 찍어주세요"',
  introduction: '오늘 너는 사진작가야. 동네 소식지에서 사진 한 장을 부탁받았어. 카메라는 상상으로 충분해.',
  estimatedMinutes: 5,
  start: 'place',
  completionMessage: '상상 속 필름에 오후 한 장을 담았어.',
  scenes: [
    {
      id: 'place',
      title: '어디서 찍을까',
      description: '오후 4시. 두 곳이 떠올라.',
      choices: [
        { label: '오래된 시장 골목', next: 'market', flag: 'market' },
        { label: '강가 산책로', next: 'river', flag: 'river' },
      ],
    },
    {
      id: 'market',
      title: '시장 골목',
      description: '천막 사이로 빛이 비스듬히 들어와. 과일 가게 앞이 반짝여.',
      choices: [
        { label: '귤 더미에 닿은 빛을 찍는다', next: 'frame', flag: 'light' },
        { label: '골목 끝까지 이어진 천막 줄을 찍는다', next: 'frame', flag: 'lines' },
      ],
    },
    {
      id: 'river',
      title: '강가',
      description: '물 위에 햇빛이 조각조각 떠 있어.',
      choices: [
        { label: '물결 위 반짝임을 가까이', next: 'frame', flag: 'light' },
        { label: '멀리 다리까지 넓게', next: 'frame', flag: 'wide' },
      ],
    },
    {
      id: 'frame',
      title: '구도',
      description: '셔터를 누르기 직전, 하나만 정해.',
      choices: [
        { label: '가로로 넓게', next: 'print', flag: 'landscape' },
        { label: '세로로 길게', next: 'print', flag: 'portrait' },
      ],
    },
    {
      id: 'print',
      title: '한 장',
      description: '찰칵. 화면 속 사진을 오래 들여다봐.',
      lines: [
        { if: 'market', text: '소식지 담당자가 "시장 냄새가 나는 사진이네요" 했어.' },
        { if: 'river', text: '강물 소리가 들릴 것 같은 사진이 됐어.' },
        { if: 'wide', text: '멀리 다리 위 사람들이 점처럼 작게 보여.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'light', when: ['light'], title: '빛을 찍은 날', message: '오늘의 빛을 한 장에 붙잡았어.' },
    { id: 'lines', when: ['lines'], title: '선이 이어지는 사진', message: '골목의 길이를 사진에 담았어.' },
    { id: 'default', title: '오늘의 한 장', message: '상상 속 필름에 오후 한 장을 담았어.' },
  ],
};
