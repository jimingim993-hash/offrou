import type { InteractiveStory } from '@/types/story';

/** 가벼운 미스터리: 카페에서 바뀐 가방. 틀려도 실패가 아니라 다른 결말일 뿐이다. */
export const DETECTIVE_STORY: InteractiveStory = {
  experienceId: 'exp-detective',
  title: '동네 탐정',
  subtitle: '카페에서 바뀐 가방 사건',
  introduction: '단서를 보고, 두 사람의 이야기를 비교해서 가방의 주인을 찾아줘.',
  estimatedMinutes: 10,
  start: 'case',
  completionMessage: '사건 해결. 오늘 탐정 일은 여기까지.',
  scenes: [
    {
      id: 'case',
      title: '사건 소개',
      description: '단골 카페 사장님의 의뢰야. 손님 두 명의 가방이 바뀌었는데, 둘 다 똑같은 남색 에코백이래.',
      lines: [{ text: '"한 분이 실수로 남의 가방을 들고 가셨어요. 남은 가방은 이거 하나예요."' }],
      next: 'clues',
    },
    {
      id: 'clues',
      title: '단서 확인',
      description: '남은 가방 안엔 영수증 한 장, 고양이 열쇠고리, 반쯤 읽은 소설책이 있어.',
      lines: [{ text: '무엇부터 살펴볼까?' }],
      choices: [
        { label: '영수증', next: 'newclue', flag: 'receipt' },
        { label: '고양이 열쇠고리', next: 'newclue', flag: 'keychain' },
        { label: '소설책', next: 'newclue', flag: 'book' },
      ],
    },
    {
      id: 'newclue',
      title: '새로운 단서',
      description: '단서를 들고 사장님에게 물어봐.',
      lines: [
        { if: 'receipt', text: '영수증엔 "바닐라 라떼, 오후 2:14". 사장님이 기억해. "그건 창가 자리 손님이 시켰어요."' },
        { if: 'keychain', text: '열쇠고리 뒤에 작은 글씨로 "보리"라고 적혀 있어. "창가 손님이 고양이 얘기를 했던 것 같아요."' },
        { if: 'book', text: '책 사이에 끼운 책갈피는 근처 대학교 도서관 것이야. "창가 자리 손님이 학생 같았어요."' },
      ],
      next: 'compare',
    },
    {
      id: 'compare',
      title: '두 사람',
      description: '가방이 바뀐 두 사람이 카페로 다시 왔어. 창가 자리의 대학생, 구석 자리의 회사원.',
      lines: [
        { text: '대학생: "저는 라떼를 마셨어요. 집에 고양이가 있고요."' },
        { text: '회사원: "저는 아메리카노요. 고양이는… 알레르기가 있어서요."' },
      ],
      choices: [
        { label: '대학생의 가방이다', next: 'result', flag: 'student' },
        { label: '회사원의 가방이다', next: 'result', flag: 'worker' },
      ],
    },
    {
      id: 'result',
      title: '사건 결과',
      description: '이제 가방을 건넬 시간이야.',
      lines: [
        { if: 'student', text: '대학생이 가방을 열고 환하게 웃어. "보리 열쇠고리! 이거 찾느라 진땀 뺐어요."' },
        { if: 'worker', text: '회사원이 가방을 열더니 웃음을 터뜨려. "고양이 열쇠고리는 제 게 아닌데요?" 다시 보니 주인은 대학생이었어.' },
        { text: '둘은 각자 가방을 돌려받고, 사장님은 탐정에게 쿠키 하나를 건네.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'solved', when: ['student'], title: '바닐라 라떼의 단서', message: '작은 단서들이 모여 가방이 주인을 찾았어.' },
    { id: 'detour', when: ['worker'], title: '한 번 돌아간 추리', message: '조금 돌아갔지만, 사건은 웃으면서 끝났어.' },
    { id: 'default', title: '카페의 작은 사건', message: '사건 해결. 오늘 탐정 일은 여기까지.' },
  ],
};
