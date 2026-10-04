import type { InteractiveStory } from '@/types/story';

export const CONCERT_HALL_STORY: InteractiveStory = {
  experienceId: 'exp-small-stage',
  title: '작은 공연장의 하루',
  subtitle: '객석 쉰 개, 오늘 밤 8시 공연',
  introduction: '오늘 너는 작은 공연장의 운영자야. 무대에 오르는 사람은 아니지만, 오늘 밤은 네가 만든다.',
  estimatedMinutes: 10,
  start: 'setup',
  completionMessage: '작은 무대의 밤을 끝까지 지켰어.',
  scenes: [
    {
      id: 'setup',
      title: '공연 전 준비',
      description: '오후 5시. 오늘 무대는 피아노 한 대와 첼로 한 대야.',
      choices: [
        { label: '의자 간격을 조금 넓힌다', next: 'light', flag: 'roomy' },
        { label: '맨 앞줄에 방석을 깐다', next: 'light', flag: 'cushion' },
      ],
    },
    {
      id: 'light',
      title: '조명',
      description: '무대 조명 색을 정해야 해.',
      choices: [
        { label: '따뜻한 주황빛', next: 'doors', flag: 'warm' },
        { label: '푸른 달빛', next: 'doors', flag: 'blue' },
      ],
    },
    {
      id: 'doors',
      title: '관객 입장',
      description: '7시 반, 문을 열자 줄이 생각보다 길어.',
      choices: [
        { label: '입구에서 한 명씩 인사한다', next: 'backstage', flag: 'greet' },
        { label: '늦게 온 사람을 위해 뒷문을 살짝 열어둔다', next: 'latecomer', flag: 'late' },
      ],
    },
    {
      id: 'backstage',
      title: '공연 직전',
      description: '대기실에서 첼로 연주자가 "떨려요" 하고 말해.',
      choices: [
        { label: '"객석이 따뜻해요." 하고 말해준다', next: 'show', flag: 'cheer' },
        { label: '물 한 잔을 건넨다', next: 'show', flag: 'water' },
      ],
    },
    {
      id: 'latecomer',
      title: '공연 직전',
      description: '숨을 고르며 들어온 손님이 뒷줄에 조용히 앉아.',
      choices: [{ label: '불을 낮춘다', next: 'show', flag: 'quiet-entry' }],
    },
    {
      id: 'show',
      title: '공연',
      description: '첫 음이 울리고, 객석이 조용해져.',
      choices: [{ label: '공연이 끝난다', next: 'close' }],
    },
    {
      id: 'close',
      title: '마감',
      description: '관객이 모두 나가고, 의자를 하나씩 정리해.',
      lines: [
        { if: 'blue', text: '푸른 조명이 꺼진 무대에 아직 음악이 남아 있는 것 같아.' },
        { if: 'warm', text: '주황빛 무대가 오늘 밤 내내 따뜻했어.' },
        { if: 'cheer', text: '연주자가 나가며 "객석, 정말 따뜻했어요" 하고 말했어.' },
        { if: 'quiet-entry', text: '늦게 온 손님이 나가며 고개 숙여 인사했어.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'cheer', when: ['cheer'], title: '떨림을 덜어준 밤', message: '무대 뒤에서 누군가의 용기를 조금 보탰어.' },
    { id: 'late', when: ['late'], title: '열어둔 뒷문', message: '늦은 사람도 놓치지 않는 밤을 만들었어.' },
    { id: 'default', title: '작은 무대', message: '작은 무대의 밤을 끝까지 지켰어.' },
  ],
};
