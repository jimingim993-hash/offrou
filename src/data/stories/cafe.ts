import type { InteractiveStory } from '@/types/story';

export const CAFE_STORY: InteractiveStory = {
  experienceId: 'exp-last-cafe',
  title: '작은 카페의 마지막 손님',
  subtitle: '마감 30분 전, 비 오는 골목 카페',
  introduction: '오늘 너는 바리스타야. 문 닫기 직전 들어온 손님 한 명의 밤을 맡아봐.',
  estimatedMinutes: 10,
  start: 'closing',
  completionMessage: '오늘 밤, 누군가의 하루 끝에 머물렀어.',
  scenes: [
    {
      id: 'closing',
      title: '마감 30분 전',
      description: '밤 9시 반, 골목 끝 작은 카페. 의자를 반쯤 올려놓았는데 문이 열려.',
      lines: [{ text: '우산을 접는 손님이 조심스럽게 묻는다. "아직 주문돼요?"' }],
      choices: [
        { label: '"그럼요, 천천히 고르세요."', next: 'order', flag: 'welcome' },
        { label: '"따뜻한 거 한 잔 정도는 괜찮아요."', next: 'order', flag: 'warm' },
      ],
    },
    {
      id: 'order',
      title: '주문',
      description: '손님은 메뉴판을 한참 보다가 말해.',
      lines: [{ text: '"뭘 마셔야 할지 모르겠어요. 하나 골라주실래요?"' }],
      choices: [
        { label: '꿀을 넣은 따뜻한 우유', next: 'talk', flag: 'milk' },
        { label: '진한 드립 커피', next: 'talk', flag: 'coffee' },
        { label: '시나몬 사과차', next: 'talk', flag: 'cinnamon' },
      ],
    },
    {
      id: 'talk',
      title: '카운터 너머',
      description: '창밖의 비가 조금 더 굵어졌어.',
      lines: [
        { if: 'milk', text: '"어릴 때 엄마가 해주던 맛이에요." 손님이 잔을 두 손으로 감싸.' },
        { if: 'coffee', text: '"오늘 밤엔 이게 필요했어요. 할 일이 아직 남아서요."' },
        { if: 'cinnamon', text: '"향이 좋네요. 벌써 겨울 같아요."' },
      ],
      choices: [
        { label: '말없이 컵을 닦으며 음악을 조금 키운다', next: 'rain', flag: 'quiet' },
        { label: '오늘 하루 어땠냐고 묻는다', next: 'rain', flag: 'ask' },
      ],
    },
    {
      id: 'rain',
      title: '비 그친 뒤',
      description: '어느새 비가 그쳤어. 손님이 일어서며 계산을 해.',
      lines: [
        { if: 'quiet', text: '음악만 흐르는 동안 손님은 노트에 무언가를 적었어.' },
        { if: 'ask', text: '"그냥… 평범하게 힘든 하루였어요." 말하고 나니 좀 낫대.' },
      ],
      choices: [
        { label: '쿠키 하나를 덤으로 챙겨준다', next: 'lights-off', flag: 'cookie' },
        { label: '문 앞까지 배웅한다', next: 'lights-off', flag: 'see-off' },
      ],
    },
    {
      id: 'lights-off',
      title: '불 끄기',
      description: '마지막 의자를 올리고, 카페 불을 하나씩 꺼.',
      lines: [
        { if: 'cookie', text: '손님은 쿠키를 주머니에 넣으며 "다음엔 낮에 올게요" 했어.' },
        { if: 'see-off', text: '손님은 골목 끝에서 한 번 돌아보고 손을 흔들었어.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'milk', when: ['milk'], title: '따뜻한 우유의 밤', message: '누군가의 하루 끝을 따뜻하게 데워줬어.' },
    { id: 'coffee', when: ['coffee'], title: '진한 커피 한 잔의 응원', message: '누군가의 남은 밤을 조용히 응원했어.' },
    { id: 'cinnamon', when: ['cinnamon'], title: '시나몬 향이 남은 카페', message: '비 오는 밤에 작은 겨울 향을 건넸어.' },
    { id: 'default', title: '작은 카페의 마지막 손님', message: '오늘 밤, 누군가의 하루 끝에 머물렀어.' },
  ],
};
