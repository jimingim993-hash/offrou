import type { InteractiveStory } from '@/types/story';

export const MAGAZINE_STORY: InteractiveStory = {
  experienceId: 'exp-magazine-editor',
  title: '작은 잡지의 편집자',
  subtitle: '스무 쪽짜리 동네 잡지, 마감은 오늘',
  introduction: '오늘 너는 작은 동네 잡지의 편집자야. 이번 호를 오늘 안에 마무리해.',
  estimatedMinutes: 10,
  start: 'theme',
  completionMessage: '세상에 한 권뿐인 이번 호를 마감했어.',
  scenes: [
    {
      id: 'theme',
      title: '이번 호 주제',
      description: '회의 탁자에 후보가 두 개 남았어.',
      choices: [
        { label: '"동네의 오래된 가게들"', next: 'old-shops', flag: 'shops' },
        { label: '"창문으로 본 계절"', next: 'windows', flag: 'windows' },
      ],
    },
    {
      id: 'old-shops',
      title: '첫 페이지',
      description: '취재해 온 가게는 40년 된 철물점과 작은 떡집이야.',
      choices: [
        { label: '철물점 사장님의 손 사진을 싣는다', next: 'photo', flag: 'hands' },
        { label: '떡집 아침 6시 풍경을 싣는다', next: 'photo', flag: 'morning' },
      ],
    },
    {
      id: 'windows',
      title: '첫 페이지',
      description: '독자들이 보내온 창문 사진이 서른 장 넘게 쌓여 있어.',
      choices: [
        { label: '가장 흐린 날의 창문을 고른다', next: 'photo', flag: 'cloudy' },
        { label: '화분이 가득한 창문을 고른다', next: 'photo', flag: 'plants' },
      ],
    },
    {
      id: 'photo',
      title: '사진의 분위기',
      description: '디자이너가 묻는다. "사진 톤은 어떻게 할까요?"',
      choices: [
        { label: '따뜻한 색으로', next: 'last-line', flag: 'warm' },
        { label: '조금 바랜 흑백으로', next: 'last-line', flag: 'mono' },
      ],
    },
    {
      id: 'last-line',
      title: '마지막 문장',
      description: '편집 후기 마지막 줄만 남았어.',
      choices: [
        { label: '"다음 호도 천천히 만들게요."', next: 'print', flag: 'slow' },
        { label: '"이번 달, 창밖을 한 번 더 보세요."', next: 'print', flag: 'look' },
      ],
    },
    {
      id: 'print',
      title: '인쇄소로',
      description: '파일을 보내고 나니 사무실이 갑자기 조용해.',
      lines: [
        { if: 'shops', text: '철물점 사장님에게 보낼 한 부를 따로 챙겨두었어.' },
        { if: 'windows', text: '사진을 보내준 독자들 이름을 맨 뒷장에 적었어.' },
        { if: 'mono', text: '흑백 사진이 오래된 앨범처럼 보여.' },
        { if: 'warm', text: '따뜻한 색 덕분에 표지가 손에 쥐고 싶어졌어.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'shops', when: ['shops'], title: '오래된 가게들의 호', message: '동네의 오래된 시간을 한 권에 담았어.' },
    { id: 'windows', when: ['windows'], title: '창문의 계절 호', message: '누군가의 창밖을 다른 사람에게 건넸어.' },
    { id: 'default', title: '이번 호 마감', message: '세상에 한 권뿐인 이번 호를 마감했어.' },
  ],
};
