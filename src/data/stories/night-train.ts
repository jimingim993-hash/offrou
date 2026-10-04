import type { InteractiveStory } from '@/types/story';

export const NIGHT_TRAIN_STORY: InteractiveStory = {
  experienceId: 'exp-night-train',
  title: '늦은 밤 기차의 승객',
  subtitle: '바닷가로 가는 마지막 기차',
  introduction: '할 일은 없어. 창가 자리에 앉아 흔들리는 밤을 지나가면 돼.',
  estimatedMinutes: 10,
  start: 'board',
  completionMessage: '잠깐, 바다로 가는 밤기차를 타고 왔어.',
  scenes: [
    {
      id: 'board',
      title: '막차 탑승',
      description: '밤 11시, 바닷가 도시로 가는 마지막 기차. 객실엔 사람이 몇 없어.',
      lines: [{ text: '창가 자리에 앉았어. 무엇부터 할까?' }],
      choices: [
        { label: '창밖 불빛을 바라본다', next: 'seatmate', flag: 'window' },
        { label: '이어폰을 꽂는다', next: 'seatmate', flag: 'music' },
      ],
    },
    {
      id: 'seatmate',
      title: '옆자리',
      description: '다음 역에서 할머니 한 분이 커다란 보따리를 들고 옆자리에 앉아.',
      lines: [{ text: '"이 기차 바닷가까지 가는 거 맞지요?"' }],
      choices: [
        { label: '보따리를 선반에 올려드린다', next: 'talk', flag: 'help' },
        { label: '맞다고 웃으며 대답한다', next: 'talk', flag: 'answer' },
      ],
    },
    {
      id: 'talk',
      title: '흔들리는 객실',
      description: '기차가 긴 터널로 들어가. 객실 불빛이 조금 흔들려.',
      lines: [
        { if: 'help', text: '할머니가 보따리에서 귤 두 개를 꺼내 하나를 건네.' },
        { if: 'answer', text: '할머니는 손녀를 보러 간대. 처음 가는 길이라 조금 긴장된대.' },
      ],
      choices: [
        { label: '할머니의 이야기를 듣는다', next: 'tunnel', flag: 'listen' },
        { label: '창에 비친 얼굴을 바라본다', next: 'tunnel', flag: 'reflect' },
      ],
    },
    {
      id: 'tunnel',
      title: '터널을 지나',
      description: '터널을 빠져나오자 멀리 바다 위로 등대 불빛이 깜빡여.',
      lines: [
        { if: 'listen', text: '할머니는 젊을 때 이 기차를 타고 처음 바다를 봤던 이야기를 해줬어.' },
        { if: 'reflect', text: '창에 비친 얼굴이 생각보다 편안해 보였어.' },
      ],
      next: 'arrive',
    },
    {
      id: 'arrive',
      title: '종착역',
      description: '기차가 천천히 멈추고, 바다 냄새가 문틈으로 들어와.',
      lines: [
        { text: '할머니는 플랫폼에서 손녀를 찾아 손을 크게 흔들었어.' },
        { if: 'window', text: '오늘 창밖으로 지나간 불빛들을 오래 기억할 것 같아.' },
        { if: 'music', text: '이어폰 속 노래가 마침 끝났어.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'listen', when: ['listen'], title: '바다로 가는 이야기', message: '누군가의 오래된 추억을 함께 실어 날랐어.' },
    { id: 'reflect', when: ['reflect'], title: '창에 비친 밤', message: '흔들리는 기차 안에서 잠깐 너 자신과 마주했어.' },
    { id: 'default', title: '늦은 밤 기차', message: '잠깐, 바다로 가는 밤기차를 타고 왔어.' },
  ],
};
