import type { InteractiveStory } from '@/types/story';

export const OBSERVATORY_STORY: InteractiveStory = {
  experienceId: 'exp-observatory',
  title: '한밤의 천문대',
  subtitle: '언덕 위 작은 천문대, 오늘은 맑음',
  introduction: '오늘 너는 작은 천문대의 밤 당번이야. 망원경 하나, 방문객 몇 명.',
  estimatedMinutes: 10,
  start: 'dome',
  completionMessage: '별 몇 개와 함께 밤을 보냈어.',
  scenes: [
    {
      id: 'dome',
      title: '돔 열기',
      description: '지붕이 천천히 열리고 찬 공기가 들어와. 오늘 첫 관측 대상을 골라.',
      choices: [
        { label: '달 — 표면의 그림자를 보기 좋은 날', next: 'moon', flag: 'moon' },
        { label: '토성 — 고리가 보일지도 몰라', next: 'saturn', flag: 'saturn' },
      ],
    },
    {
      id: 'moon',
      title: '달',
      description: '접안렌즈 속 달이 생각보다 울퉁불퉁해.',
      choices: [{ label: '방문객을 부른다', next: 'visitor', flag: 'shared-moon' }],
    },
    {
      id: 'saturn',
      title: '토성',
      description: '작은 점 옆에 정말 고리가 보여. 손이 조금 떨려.',
      choices: [{ label: '방문객을 부른다', next: 'visitor', flag: 'shared-saturn' }],
    },
    {
      id: 'visitor',
      title: '방문객',
      description: '아이와 함께 온 어른이 망원경 앞에 줄을 섰어. 아이가 묻는다. "별은 왜 반짝여요?"',
      choices: [
        { label: '"하늘의 공기가 흔들려서 그래."', next: 'late', flag: 'explain' },
        { label: '"너는 왜 그런 것 같아?" 되묻는다', next: 'late', flag: 'wonder' },
      ],
    },
    {
      id: 'late',
      title: '자정',
      description: '방문객이 모두 돌아가고, 하늘이 더 깊어졌어.',
      choices: [
        { label: '망원경 없이 맨눈으로 하늘을 본다', next: 'close', flag: 'naked-eye' },
        { label: '오늘 본 것을 관측 일지에 적는다', next: 'close', flag: 'log' },
      ],
    },
    {
      id: 'close',
      title: '돔 닫기',
      description: '지붕을 닫고 불을 꺼.',
      lines: [
        { if: 'shared-saturn', text: '아이가 "고리 진짜 있어요!" 하던 목소리가 아직 들리는 것 같아.' },
        { if: 'shared-moon', text: '달 그림자를 처음 본 어른이 한참 말이 없었어.' },
        { if: 'wonder', text: '아이는 "별도 졸려서 깜빡이는 거 아닐까요?" 하고 대답했어.' },
        { if: 'log', text: '일지 마지막 줄: "맑음. 손님 넷. 다들 고개를 오래 들고 있었다."' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'saturn', when: ['saturn'], title: '고리를 본 밤', message: '아주 먼 것을 아주 가까이 본 밤이었어.' },
    { id: 'wonder', when: ['wonder'], title: '질문이 반짝인 밤', message: '정답보다 궁금함을 하나 더 건넸어.' },
    { id: 'default', title: '한밤의 천문대', message: '별 몇 개와 함께 밤을 보냈어.' },
  ],
};
