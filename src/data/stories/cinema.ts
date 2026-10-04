import type { InteractiveStory } from '@/types/story';

export const CINEMA_STORY: InteractiveStory = {
  experienceId: 'exp-last-screening',
  title: '독립영화관의 마지막 상영',
  subtitle: '좌석 마흔 개, 오늘의 마지막 회차',
  introduction: '오늘 너는 동네 작은 영화관의 관리자야. 밤 9시 마지막 상영을 준비해.',
  estimatedMinutes: 10,
  start: 'poster',
  completionMessage: '오늘 밤, 작은 영화관의 불을 끄고 나왔어.',
  scenes: [
    {
      id: 'poster',
      title: '포스터 걸기',
      description: '오늘 마지막 상영작은 바다 마을을 찍은 짧은 영화야. 입구에 포스터를 걸어야 해.',
      choices: [
        { label: '손글씨 안내문을 옆에 붙인다', next: 'lobby', flag: 'handwritten' },
        { label: '조명을 포스터 쪽으로 돌린다', next: 'lobby', flag: 'spotlight' },
      ],
    },
    {
      id: 'lobby',
      title: '로비',
      description: '상영 20분 전. 로비에 손님 둘이 들어와.',
      lines: [
        { if: 'handwritten', text: '한 손님이 안내문을 소리 내어 읽고 웃는다.' },
        { if: 'spotlight', text: '포스터 앞에 멈춰 선 손님이 사진을 한 장 찍는다.' },
      ],
      choices: [
        { label: '혼자 온 노신사에게 먼저 인사한다', next: 'gentleman', flag: 'gentleman' },
        { label: '교복 차림 학생에게 좌석을 안내한다', next: 'student', flag: 'student' },
      ],
    },
    {
      id: 'gentleman',
      title: '단골 손님',
      description: '노신사는 "이 영화관에서 처음 본 영화가 마흔 해 전이에요" 하고 말해.',
      choices: [
        { label: '늘 앉던 자리를 묻는다', next: 'dark', flag: 'seat' },
        { label: '따뜻한 보리차를 건넨다', next: 'dark', flag: 'tea' },
      ],
    },
    {
      id: 'student',
      title: '처음 온 손님',
      description: '학생은 "독립영화는 처음이에요. 재미없으면 어떡하죠?" 하고 묻는다.',
      choices: [
        { label: '"재미없으면 졸아도 돼요."', next: 'dark', flag: 'relax' },
        { label: '가장 화면이 잘 보이는 자리를 골라준다', next: 'dark', flag: 'seat' },
      ],
    },
    {
      id: 'dark',
      title: '불이 꺼지기 직전',
      description: '손님은 모두 열한 명. 상영실 불을 낮출 시간이야.',
      choices: [
        { label: '짧게 "즐거운 관람 되세요" 하고 나간다', next: 'close', flag: 'greet' },
        { label: '아무 말 없이 천천히 불을 낮춘다', next: 'close', flag: 'quiet' },
      ],
    },
    {
      id: 'close',
      title: '마감',
      description: '영화가 끝나고 손님들이 하나둘 나가. 빈 좌석 사이를 한 번 걸어봐.',
      lines: [
        { if: 'gentleman', text: '노신사가 나가며 "다음 달에도 올게요" 하고 모자를 들어 보였어.' },
        { if: 'student', text: '학생이 "생각보다 좋았어요" 하고 작게 말하고 갔어.' },
        { if: 'tea', text: '빈 보리차 컵 하나가 가지런히 놓여 있어.' },
        { if: 'relax', text: '학생은 끝까지 한 번도 졸지 않았대.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'old-friend', when: ['gentleman', 'tea'], title: '마흔 해 된 단골', message: '오래된 영화관의 시간을 누군가와 함께 지켰어.' },
    { id: 'first-time', when: ['student'], title: '누군가의 첫 독립영화', message: '누군가에게 오늘이 처음의 기억이 됐어.' },
    { id: 'seat', when: ['seat'], title: '딱 맞는 자리', message: '좋은 자리 하나가 좋은 밤을 만들었어.' },
    { id: 'default', title: '마지막 상영', message: '오늘 밤, 작은 영화관의 불을 끄고 나왔어.' },
  ],
};
