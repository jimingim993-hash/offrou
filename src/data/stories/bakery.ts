import type { InteractiveStory } from '@/types/story';

export const BAKERY_STORY: InteractiveStory = {
  experienceId: 'exp-alley-bakery',
  title: '골목의 작은 빵집',
  subtitle: '아침 7시, 빵 냄새가 골목으로 번질 때',
  introduction: '오늘 너는 골목 빵집의 주인이야. 오늘의 빵부터 정해볼까?',
  estimatedMinutes: 10,
  start: 'bread',
  completionMessage: '골목에 빵 냄새가 머문 하루를 보냈어.',
  scenes: [
    {
      id: 'bread',
      title: '오늘의 빵',
      description: '진열대 맨 앞에 놓을 빵 하나를 골라.',
      choices: [
        { label: '버터 냄새 나는 크루아상', next: 'first', flag: 'croissant' },
        { label: '동그란 단팥빵', next: 'first', flag: 'redbean' },
        { label: '통밀 식빵', next: 'first', flag: 'bread' },
      ],
    },
    {
      id: 'first',
      title: '첫 손님',
      description: '출근길 손님이 문을 열자 종이 딸랑 울려. "오늘 뭐가 제일 맛있어요?"',
      choices: [
        { label: '오늘의 빵을 권한다', next: 'afternoon', flag: 'recommend' },
        { label: '"갓 나온 걸로 드릴게요."', next: 'afternoon', flag: 'fresh' },
      ],
    },
    {
      id: 'afternoon',
      title: '오후',
      description: '손님이 뜸한 시간. 오븐 앞이 따뜻해.',
      choices: [
        { label: '창가에 앉아 커피 한 잔', next: 'last', flag: 'break' },
        { label: '내일 반죽을 미리 준비한다', next: 'dough', flag: 'dough' },
      ],
    },
    {
      id: 'dough',
      title: '반죽',
      description: '손바닥으로 반죽을 누르는 소리만 가게에 남아.',
      choices: [{ label: '저녁이 된다', next: 'last' }],
    },
    {
      id: 'last',
      title: '마지막 남은 빵',
      description: '마감 30분 전, 빵 두 개가 남았어. 학생 하나가 동전을 세고 있어.',
      choices: [
        { label: '두 개를 같이 담아준다', next: 'close', flag: 'share' },
        { label: '하나는 내일 아침 첫 손님 몫으로 둔다', next: 'close', flag: 'save' },
      ],
    },
    {
      id: 'close',
      title: '마감',
      description: '진열대를 닦고, 셔터를 반쯤 내려.',
      lines: [
        { if: 'share', text: '학생이 "내일도 올게요!" 하고 골목을 뛰어갔어.' },
        { if: 'save', text: '남겨둔 빵 하나가 내일 아침을 기다려.' },
        { if: 'dough', text: '내일 반죽이 천천히 부풀고 있어.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'share', when: ['share'], title: '덤으로 담은 하루', message: '빵 하나만큼의 다정함을 건넸어.' },
    { id: 'croissant', when: ['croissant'], title: '버터 냄새 나는 골목', message: '골목 전체가 오늘 크루아상 냄새였어.' },
    { id: 'default', title: '빵집의 하루', message: '골목에 빵 냄새가 머문 하루를 보냈어.' },
  ],
};
