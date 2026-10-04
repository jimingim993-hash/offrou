import type { InteractiveStory } from '@/types/story';

export const POSTMAN_STORY: InteractiveStory = {
  experienceId: 'exp-postman',
  title: '편지를 전하는 우체부',
  subtitle: '오래된 마을, 가방 속 편지 세 통',
  introduction: '오늘 너는 마을 우체부야. 편지 세 통을 주인에게 전해주면 돼.',
  estimatedMinutes: 10,
  start: 'bag',
  completionMessage: '오늘 편지 세 통이 제자리를 찾았어.',
  scenes: [
    {
      id: 'bag',
      title: '우편 가방',
      description: '가방을 메고 마을 어귀에 섰어. 오늘 가방엔 편지 세 통이 들어 있어.',
      lines: [{ text: '어느 길로 먼저 갈까?' }],
      choices: [
        { label: '언덕 위 집부터', next: 'letter1', flag: 'hill' },
        { label: '가까운 빵집 골목부터', next: 'letter1', flag: 'bakery' },
      ],
    },
    {
      id: 'letter1',
      title: '첫 번째 편지',
      description: '보내는 사람 칸엔 "멀리 사는 딸이"라고 적혀 있어.',
      lines: [
        { if: 'hill', text: '언덕을 오르니 숨이 조금 차. 마당에서 할아버지가 장미에 물을 주고 있어.' },
        { if: 'bakery', text: '빵집 골목에 들어서자 갓 구운 빵 냄새가 가방까지 스며들어.' },
      ],
      choices: [
        { label: '직접 손에 건넨다', next: 'letter2', flag: 'hand' },
        { label: '우편함에 넣고 조용히 돌아선다', next: 'letter2', flag: 'box' },
      ],
    },
    {
      id: 'letter2',
      title: '두 번째 편지',
      description: '두 번째 편지는 주소가 번져서 잘 보이지 않아.',
      lines: [
        { if: 'hand', text: '편지를 받은 할아버지의 눈가가 금세 촉촉해졌어. "고마워요, 정말."' },
        { if: 'box', text: '돌아서는데 뒤에서 우편함 여는 소리와 작은 웃음소리가 들렸어.' },
      ],
      choices: [
        { label: '동네 사람들에게 물어본다', next: 'letter3', flag: 'ask' },
        { label: '글씨를 천천히 다시 읽어본다', next: 'letter3', flag: 'read' },
      ],
    },
    {
      id: 'letter3',
      title: '마지막 편지',
      description: '마지막 편지를 꺼냈는데, 받는 사람이… 너야.',
      lines: [
        { if: 'ask', text: '두 번째 편지는 세탁소 아저씨가 단번에 알아봐 줬어. "아, 그 집 3층이야!"' },
        { if: 'read', text: '번진 글씨 사이로 "파란 대문"이 보였어. 파란 대문은 금방 찾았지.' },
      ],
      choices: [
        { label: '지금 바로 열어본다', next: 'end', flag: 'open' },
        { label: '집에 가서 열기로 한다', next: 'end', flag: 'later' },
      ],
    },
    {
      id: 'end',
      title: '우체부의 하루',
      description: '빈 가방을 메고 노을 진 길을 걸어.',
      lines: [
        { if: 'open', text: '편지엔 짧게 적혀 있었어. "오늘도 수고했어. — 내일의 너가"' },
        { if: 'later', text: '주머니 속 편지가 걸음마다 바스락거려. 여는 순간을 조금 아껴두기로 했어.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'open', when: ['open'], title: '내일의 내가 보낸 편지', message: '오늘 전한 편지 중 가장 다정한 건 네 거였어.' },
    { id: 'later', when: ['later'], title: '아껴둔 편지', message: '기다리는 즐거움도 오늘의 선물이야.' },
    { id: 'default', title: '우체부의 하루', message: '오늘 편지 세 통이 제자리를 찾았어.' },
  ],
};
