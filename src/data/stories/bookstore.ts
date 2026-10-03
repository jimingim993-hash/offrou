import type { InteractiveStory } from '@/types/story';

export const BOOKSTORE_STORY: InteractiveStory = {
  experienceId: 'exp-bookstore',
  title: '작은 서점의 주인',
  subtitle: '오늘 하루, 골목 끝 서점은 네 거야',
  introduction: '경영할 필요는 없어. 문을 열고, 손님을 맞고, 어울리는 책을 건네면 돼.',
  estimatedMinutes: 10,
  start: 'open',
  completionMessage: '오늘은 잠깐 서점 주인으로 살아봤어.',
  scenes: [
    {
      id: 'open',
      title: '서점 문 열기',
      description: '비가 그친 아침, 골목 끝 작은 서점. 셔터를 올리자 종이 냄새가 훅 밀려와.',
      choices: [
        { label: '창문을 활짝 연다', next: 'guest1', flag: 'airy' },
        { label: '작은 스탠드부터 켠다', next: 'guest1', flag: 'cozy' },
      ],
    },
    {
      id: 'guest1',
      title: '첫 번째 손님',
      description: '문에 달린 종이 딸랑 울려. 후드티를 입은 손님이 머뭇거리다 말해.',
      lines: [
        { text: '"요즘 아무것도 하기 싫어서요. 책이라도 읽어보려고요."' },
        { if: 'airy', text: '열어둔 창으로 들어온 바람이 손님 머리칼을 살짝 흔들어.' },
        { if: 'cozy', text: '스탠드 불빛 아래, 손님 얼굴이 조금 풀어지는 게 보여.' },
      ],
      choices: [
        { label: '짧은 시가 담긴 얇은 시집', next: 'guest2', flag: 'poem' },
        { label: '먼 곳 사진이 가득한 여행 에세이', next: 'guest2', flag: 'travel' },
        { label: '글이 거의 없는 그림책', next: 'guest2', flag: 'picture' },
      ],
    },
    {
      id: 'guest2',
      title: '두 번째 손님',
      description: '점심 무렵, 교복 입은 아이가 계산대 위에 동전을 쏟아놓아.',
      lines: [
        { if: 'poem', text: '창가에선 아까 그 손님이 아직 시집을 넘기고 있어.' },
        { if: 'travel', text: '아까 그 손님은 여행 에세이를 품에 안고, 엽서 한 장을 더 사 갔어.' },
        { if: 'picture', text: '아까 그 손님은 그림책 앞에서 한참 웃다 갔어.' },
        { text: '"엄마 생일인데요, 이걸로 살 수 있는 책 있어요?"' },
      ],
      choices: [
        { label: '동전에 맞는 작은 책을 같이 고른다', next: 'closing', flag: 'together' },
        { label: '책을 고르면 예쁘게 포장해 준다', next: 'closing', flag: 'wrap' },
      ],
    },
    {
      id: 'closing',
      title: '하루 마감',
      description: '해가 지고, 마지막 손님이 나갔어. 문을 닫기 전에 하나만 더 할 수 있어.',
      lines: [
        { if: 'together', text: '아이가 고른 책 첫 장엔 삐뚤빼뚤 "엄마에게"라고 적혀 있었지.' },
        { if: 'wrap', text: '포장한 책을 안고 뛰어가던 아이의 뒷모습이 아직 눈에 선해.' },
      ],
      choices: [
        { label: '오늘 일을 메모장에 한 줄 적는다', next: 'ending', flag: 'note' },
        { label: '음악을 틀고 서가를 정리한다', next: 'ending', flag: 'tidy' },
      ],
    },
    {
      id: 'ending',
      title: '오늘의 서점 이야기',
      description: '불을 끄기 전, 조용해진 서점을 한 번 둘러봐.',
      lines: [
        { if: 'poem', text: '어딘가에서 누군가는 오늘 건넨 시 한 편을 다시 읽고 있을 거야.' },
        { if: 'travel', text: '누군가의 다음 여행은 오늘 건넨 책에서 시작될지도 몰라.' },
        { if: 'picture', text: '그림책 한 권이 누군가의 무거운 하루를 조금 가볍게 했어.' },
        { if: 'note', text: '메모장엔 이렇게 적었어. "오늘, 책 두 권이 주인을 찾았다."' },
        { if: 'tidy', text: '가지런해진 서가가 내일 손님을 기다리고 있어.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'poem', when: ['poem'], title: '시 한 편이 머문 하루', message: '오늘은 누군가에게 꼭 맞는 문장을 건넸어.' },
    { id: 'travel', when: ['travel'], title: '멀리 가는 책을 건넨 날', message: '오늘 건넨 책이 누군가를 먼 곳으로 데려갈 거야.' },
    { id: 'picture', when: ['picture'], title: '그림책처럼 가벼운 하루', message: '오늘 서점엔 웃음이 하나 머물다 갔어.' },
    { id: 'default', title: '작은 서점의 하루', message: '오늘은 잠깐 서점 주인으로 살아봤어.' },
  ],
};
