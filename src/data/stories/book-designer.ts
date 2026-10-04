import type { InteractiveStory } from '@/types/story';

export const BOOK_DESIGNER_STORY: InteractiveStory = {
  experienceId: 'exp-book-designer',
  title: '하루 동안 북디자이너',
  subtitle: '제목: 「느린 오후의 지도」',
  introduction: '오늘 너는 북디자이너야. 아직 표지가 없는 책 한 권을 맡았어.',
  estimatedMinutes: 5,
  start: 'mood',
  completionMessage: '세상에 없던 표지 하나를 만들었어.',
  scenes: [
    {
      id: 'mood',
      title: '표지 분위기',
      description: '원고를 읽고 나니 떠오르는 장면이 둘이야.',
      choices: [
        { label: '오후 햇빛이 드는 빈 방', next: 'room', flag: 'room' },
        { label: '구불구불한 손그림 지도', next: 'map', flag: 'map' },
      ],
    },
    {
      id: 'room',
      title: '빈 방',
      description: '창문 하나와 긴 그림자만 남겨볼까?',
      choices: [
        { label: '그림자를 표지 아래까지 길게', next: 'title', flag: 'shadow' },
        { label: '창문만 작게 가운데', next: 'title', flag: 'small-window' },
      ],
    },
    {
      id: 'map',
      title: '지도',
      description: '길 끝에 작은 점 하나를 찍을지 고민돼.',
      choices: [
        { label: '점을 찍는다 — 도착지가 있는 지도', next: 'title', flag: 'dot' },
        { label: '찍지 않는다 — 끝이 열린 지도', next: 'title', flag: 'open' },
      ],
    },
    {
      id: 'title',
      title: '제목 위치',
      description: '제목을 어디에 둘까?',
      choices: [
        { label: '위쪽에 작게', next: 'color', flag: 'top' },
        { label: '아래쪽에 크게', next: 'color', flag: 'bottom' },
      ],
    },
    {
      id: 'color',
      title: '색',
      description: '마지막으로 바탕색을 골라.',
      choices: [
        { label: '연한 모래색', next: 'done', flag: 'sand' },
        { label: '깊은 남색', next: 'done', flag: 'navy' },
      ],
    },
    {
      id: 'done',
      title: '표지 완성',
      description: '책상 위에 시안을 세워두고 한 걸음 물러나 봐.',
      lines: [
        { if: 'shadow', text: '긴 그림자가 책을 펼치기도 전에 오후를 데려와.' },
        { if: 'open', text: '끝이 열린 지도가 "어디로 가도 괜찮아" 하고 말하는 것 같아.' },
        { if: 'navy', text: '남색 바탕 위 제목이 밤길의 표지판처럼 보여.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'room', when: ['room'], title: '빈 방의 오후', message: '조용한 오후를 한 장의 표지로 만들었어.' },
    { id: 'map', when: ['map'], title: '느린 지도', message: '천천히 걷고 싶어지는 표지를 만들었어.' },
    { id: 'default', title: '표지 하나', message: '세상에 없던 표지 하나를 만들었어.' },
  ],
};
