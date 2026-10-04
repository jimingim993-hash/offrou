import type { InteractiveStory } from '@/types/story';

export const CONVENIENCE_STORY: InteractiveStory = {
  experienceId: 'exp-dawn-store',
  title: '새벽 편의점',
  subtitle: '새벽 3시, 불 켜진 골목의 가게',
  introduction: '오늘 너는 조용한 새벽 편의점을 잠깐 맡았어. 손님은 많지 않아.',
  estimatedMinutes: 5,
  start: 'counter',
  completionMessage: '새벽 골목의 작은 불빛이 되어봤어.',
  scenes: [
    {
      id: 'counter',
      title: '새벽 3시',
      description: '음악이 작게 흐르는 가게. 할 일을 하나 골라.',
      choices: [
        { label: '컵라면 진열대를 가지런히 정리한다', next: 'shelf', flag: 'shelf' },
        { label: '유리문 너머 골목을 잠깐 본다', next: 'window', flag: 'window' },
      ],
    },
    {
      id: 'shelf',
      title: '진열대',
      description: '맛별로 줄을 맞추니 진열대가 색깔 띠처럼 보여.',
      choices: [{ label: '계산대로 돌아간다', next: 'customer', flag: 'tidy' }],
    },
    {
      id: 'window',
      title: '골목',
      description: '가로등 아래로 고양이 한 마리가 천천히 지나가.',
      choices: [{ label: '계산대로 돌아간다', next: 'customer', flag: 'cat' }],
    },
    {
      id: 'customer',
      title: '손님',
      description: '작업복 차림 손님이 따뜻한 캔커피 하나를 계산대에 올려.',
      choices: [
        { label: '"오늘 춥죠." 짧게 말을 건넨다', next: 'dawn', flag: 'talk' },
        { label: '봉투가 필요한지만 묻는다', next: 'dawn', flag: 'simple' },
      ],
    },
    {
      id: 'dawn',
      title: '하늘이 밝아질 때',
      description: '창밖이 조금씩 파래져. 교대 시간이 다가와.',
      lines: [
        { if: 'talk', text: '손님은 "덕분에 덜 춥네요" 하고 나갔어.' },
        { if: 'cat', text: '아까 그 고양이가 문 앞에 잠깐 앉았다 갔어.' },
        { if: 'tidy', text: '정리한 진열대가 아침 손님을 기다려.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'warm', when: ['talk'], title: '따뜻한 한마디', message: '새벽에 건넨 말 한마디가 누군가의 아침을 데웠어.' },
    { id: 'cat', when: ['cat'], title: '고양이가 지나간 새벽', message: '조용한 새벽에 작은 손님 하나를 만났어.' },
    { id: 'default', title: '새벽 편의점', message: '새벽 골목의 작은 불빛이 되어봤어.' },
  ],
};
