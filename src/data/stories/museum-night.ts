import type { InteractiveStory } from '@/types/story';

export const MUSEUM_NIGHT_STORY: InteractiveStory = {
  experienceId: 'exp-museum-night',
  title: '작은 박물관의 야간 관리인',
  subtitle: '관람객이 모두 떠난 밤의 박물관',
  introduction: '손전등 하나를 들고 조용한 전시실을 한 바퀴 돌면 돼. 무서운 일은 일어나지 않아.',
  estimatedMinutes: 15,
  start: 'patrol',
  completionMessage: '오늘 밤, 아무도 없는 박물관을 지켰어.',
  scenes: [
    {
      id: 'patrol',
      title: '순찰 시작',
      description: '작은 시립 박물관, 밤 8시. 오늘 너는 야간 관리인이야.',
      lines: [{ text: '손전등을 켜고 어디부터 돌아볼까?' }],
      choices: [
        { label: '2층 그림 전시실', next: 'room', flag: 'paintings' },
        { label: '1층 오래된 시계 전시실', next: 'room', flag: 'clocks' },
      ],
    },
    {
      id: 'room',
      title: '첫 번째 전시실',
      description: '그때 어딘가에서 작은 소리가 들려.',
      lines: [
        { if: 'paintings', text: '불 꺼진 전시실, 손전등 빛 아래 그림 속 사람들이 너를 바라보는 것 같아.' },
        { if: 'clocks', text: '수십 개의 시계가 저마다 다른 시간을 가리키고 있어. 똑딱 소리가 겹쳐 들려.' },
      ],
      choices: [
        { label: '소리 나는 쪽으로 간다', next: 'sound', flag: 'follow' },
        { label: '잠시 멈춰서 귀를 기울인다', next: 'sound', flag: 'listen' },
      ],
    },
    {
      id: 'sound',
      title: '소리의 정체',
      description: '창을 닫고 돌아서는데, 전시 설명판 하나가 바닥에 떨어져 있어.',
      lines: [
        { if: 'follow', text: '창문 틈으로 들어온 바람이 커튼을 흔들고 있었어.' },
        { if: 'listen', text: '가만히 들어보니 시계 하나가 정확히 9시를 알리고 있었어.' },
      ],
      choices: [
        { label: '제자리에 다시 걸어둔다', next: 'note', flag: 'hang' },
        { label: '먼저 읽어본다', next: 'note', flag: 'read' },
      ],
    },
    {
      id: 'note',
      title: '설명판',
      description: '순찰이 거의 끝났어. 마지막으로 무엇을 할까?',
      lines: [
        { if: 'read', text: '설명판엔 "이 시계는 100년 동안 한 번도 멈춘 적이 없다"고 적혀 있어.' },
        { if: 'hang', text: '설명판을 걸며 보니 뒷면에 누군가 연필로 "잘 자"라고 적어둔 게 보여.' },
      ],
      choices: [
        { label: '가장 좋아하는 작품 앞에 잠깐 앉는다', next: 'end', flag: 'sit' },
        { label: '순찰 일지를 쓴다', next: 'end', flag: 'log' },
      ],
    },
    {
      id: 'end',
      title: '순찰 끝',
      description: '출입문을 잠그며 조용한 박물관을 한 번 돌아봐.',
      lines: [
        { if: 'sit', text: '작품 앞에 앉아 있던 몇 분이 오늘 가장 조용한 시간이었어.' },
        { if: 'log', text: '일지엔 짧게 적었어. "이상 없음. 밤의 박물관은 아름다움."' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'paintings', when: ['paintings'], title: '그림들이 지켜본 밤', message: '아무도 없는 전시실에서 그림들과 밤을 보냈어.' },
    { id: 'clocks', when: ['clocks'], title: '멈추지 않는 시계의 밤', message: '수많은 시간 사이를 천천히 걸었어.' },
    { id: 'default', title: '박물관의 밤', message: '오늘 밤, 아무도 없는 박물관을 지켰어.' },
  ],
};
