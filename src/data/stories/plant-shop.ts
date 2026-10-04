import type { InteractiveStory } from '@/types/story';

export const PLANT_SHOP_STORY: InteractiveStory = {
  experienceId: 'exp-plant-shop',
  title: '작은 식물가게',
  subtitle: '초록 화분이 빼곡한 골목 가게',
  introduction: '오늘 너는 작은 식물가게를 맡았어. 손님에게 어울리는 분위기의 화분을 골라줘.',
  estimatedMinutes: 10,
  start: 'morning',
  completionMessage: '초록 몇 개를 새로운 집으로 보냈어.',
  scenes: [
    {
      id: 'morning',
      title: '아침',
      description: '가게 문을 열기 전, 화분들에게 할 일을 하나 골라.',
      choices: [
        { label: '창가로 화분을 옮겨 햇빛을 나눠준다', next: 'first', flag: 'sun' },
        { label: '이름표를 새로 써서 붙인다', next: 'first', flag: 'labels' },
      ],
    },
    {
      id: 'first',
      title: '첫 손님',
      description: '"이사한 지 얼마 안 됐어요. 방이 좀 허전해서요."',
      choices: [
        { label: '잎이 큰 화분을 보여준다', next: 'big', flag: 'big-leaf' },
        { label: '책상에 둘 작은 화분을 보여준다', next: 'small', flag: 'small' },
      ],
    },
    {
      id: 'big',
      title: '큰 잎',
      description: '손님이 잎을 손끝으로 만져보더니 "방이 숲 같겠네요" 하고 웃어.',
      choices: [{ label: '포장해준다', next: 'second' }],
    },
    {
      id: 'small',
      title: '작은 화분',
      description: '손님이 손바닥만 한 화분을 들고 "얘는 이름이 뭐예요?" 하고 물어.',
      choices: [
        { label: '"이름은 직접 지어주세요."', next: 'second', flag: 'name' },
        { label: '이름표에 적힌 이름을 알려준다', next: 'second' },
      ],
    },
    {
      id: 'second',
      title: '오후 손님',
      description: '선물을 찾는 손님이 와. "친구가 새 일을 시작해요."',
      choices: [
        { label: '노란 꽃이 핀 화분', next: 'close', flag: 'yellow' },
        { label: '천천히 자라는 초록 화분', next: 'close', flag: 'slow' },
      ],
    },
    {
      id: 'close',
      title: '문 닫기',
      description: '빈자리가 생긴 진열대를 정리하며 하루를 마무리해.',
      lines: [
        { if: 'big-leaf', text: '숲 같은 방이 하나 생겼을 거야.' },
        { if: 'name', text: '작은 화분은 오늘 처음 이름을 얻었겠지.' },
        { if: 'slow', text: '천천히 자라는 화분처럼 새 일도 천천히 자라길.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'forest', when: ['big-leaf'], title: '방 안의 작은 숲', message: '누군가의 빈 방에 초록을 채웠어.' },
    { id: 'name', when: ['name'], title: '이름을 얻은 화분', message: '작은 화분 하나가 새 이름과 함께 떠났어.' },
    { id: 'default', title: '식물가게의 하루', message: '초록 몇 개를 새로운 집으로 보냈어.' },
  ],
};
