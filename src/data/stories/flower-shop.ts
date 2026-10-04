import type { InteractiveStory } from '@/types/story';

export const FLOWER_SHOP_STORY: InteractiveStory = {
  experienceId: 'exp-flower-shop',
  title: '하루 동안 꽃집 맡기',
  subtitle: '초록 냄새 가득한 동네 꽃집',
  introduction: '아는 사람의 꽃집을 하루 맡게 됐어. 손님마다 어울리는 꽃을 골라주면 돼.',
  estimatedMinutes: 10,
  start: 'open',
  completionMessage: '오늘은 꽃으로 사람들의 마음을 전해줬어.',
  scenes: [
    {
      id: 'open',
      title: '꽃집 문 열기',
      description: '물통마다 꽃이 가득하고, 가게 안이 초록 냄새로 차 있어.',
      lines: [{ text: '문을 열기 전에 하나만 정리해볼까?' }],
      choices: [
        { label: '창가에 해바라기를 내놓는다', next: 'guest1', flag: 'sunflower' },
        { label: '문 앞에 작은 화분들을 줄 세운다', next: 'guest1', flag: 'pots' },
      ],
    },
    {
      id: 'guest1',
      title: '첫 번째 손님',
      description: '넥타이를 맨 손님이 급하게 들어와.',
      lines: [
        { if: 'sunflower', text: '창가 해바라기를 힐끗 보더니 숨을 고르고 말해.' },
        { if: 'pots', text: '문 앞 화분 하나에 걸려 넘어질 뻔하다가 멋쩍게 웃어.' },
        { text: '"오늘 사과해야 할 사람이 있어요. 어떤 꽃이 좋을까요?"' },
      ],
      choices: [
        { label: '하얀 튤립', next: 'guest2', flag: 'tulip' },
        { label: '노란 프리지어', next: 'guest2', flag: 'freesia' },
        { label: '꽃 한 송이와 작은 카드', next: 'guest2', flag: 'card' },
      ],
    },
    {
      id: 'guest2',
      title: '두 번째 손님',
      description: '오후엔 꼬마 손님이 동전 세 개를 계산대에 올려놓아. "할머니 드릴 꽃 한 송이요."',
      lines: [
        { if: 'tulip', text: '아까 넥타이 손님은 하얀 튤립을 안고 심호흡을 하며 나갔지.' },
        { if: 'freesia', text: '아까 넥타이 손님은 프리지어 향을 맡고 조금 웃으며 나갔지.' },
        { if: 'card', text: '아까 넥타이 손님은 카드에 한참 무언가를 적고 나갔지.' },
      ],
      choices: [
        { label: '가장 예쁜 카네이션 한 송이를 골라준다', next: 'evening', flag: 'carnation' },
        { label: '꼬마가 직접 고르게 해준다', next: 'evening', flag: 'choose' },
      ],
    },
    {
      id: 'evening',
      title: '저녁',
      description: '가게를 닫기 전, 팔리지 않은 꽃 몇 송이가 남았어.',
      lines: [
        { if: 'carnation', text: '꼬마는 카네이션을 깃발처럼 들고 뛰어갔어.' },
        { if: 'choose', text: '꼬마가 고른 건 들꽃처럼 작은 데이지였어. 꽤 안목이 있어.' },
      ],
      choices: [
        { label: '작은 꽃다발로 묶어 집에 가져간다', next: 'end', flag: 'home' },
        { label: '내일 손님들을 위해 물을 갈아준다', next: 'end', flag: 'water' },
      ],
    },
    {
      id: 'end',
      title: '꽃집의 하루',
      description: '셔터를 내리며 오늘 지나간 꽃들을 떠올려.',
      lines: [
        { if: 'home', text: '오늘 밤 네 식탁에도 꽃이 한 다발 놓일 거야.' },
        { if: 'water', text: '내일 아침 문을 여는 사람은 싱싱한 꽃을 만나게 될 거야.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'card', when: ['card'], title: '카드 한 장의 용기', message: '오늘 누군가의 마음이 꽃을 타고 전해졌어.' },
    { id: 'tulip', when: ['tulip'], title: '하얀 튤립의 하루', message: '조용한 사과 하나가 꽃과 함께 길을 나섰어.' },
    { id: 'freesia', when: ['freesia'], title: '프리지어 향이 남은 날', message: '가게 안에 노란 향이 오래 남았어.' },
    { id: 'default', title: '꽃집의 하루', message: '오늘은 꽃으로 사람들의 마음을 전해줬어.' },
  ],
};
