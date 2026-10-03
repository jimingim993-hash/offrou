import type { InteractiveStory } from '@/types/story';

export const HOTEL_STORY: InteractiveStory = {
  experienceId: 'exp-small-hotel',
  title: '작은 호텔의 하루',
  subtitle: '방이 다섯 개뿐인 바닷가 호텔의 프런트',
  introduction: '복잡한 운영은 없어. 손님을 맞고, 작은 부탁을 들어주면 돼.',
  estimatedMinutes: 15,
  start: 'checkin',
  completionMessage: '오늘은 바닷가 호텔에서 하루를 보내고 왔어.',
  scenes: [
    {
      id: 'checkin',
      title: '체크인',
      description: '바닷가 언덕 위 작은 호텔. 오늘 너는 프런트 담당이야. 첫 손님은 커다란 배낭을 멘 여행자.',
      lines: [{ text: '"하룻밤만 묵을게요. 조용한 방이면 좋겠어요."' }],
      choices: [
        { label: '바다가 보이는 3호실', next: 'request', flag: 'sea' },
        { label: '정원 쪽 5호실', next: 'request', flag: 'garden' },
      ],
    },
    {
      id: 'request',
      title: '객실 전화',
      description: '한 시간쯤 지나 프런트 전화가 울려.',
      lines: [
        { if: 'sea', text: '"파도 소리가 너무 좋아요. 혹시 따뜻한 차를 받을 수 있을까요?"' },
        { if: 'garden', text: '"정원에서 새소리가 들려요. 혹시 따뜻한 차를 받을 수 있을까요?"' },
      ],
      choices: [
        { label: '보리차에 쿠키 두 개를 곁들인다', next: 'guest2', flag: 'cookie' },
        { label: '레몬차와 손글씨 메모를 함께 둔다', next: 'guest2', flag: 'memo' },
      ],
    },
    {
      id: 'guest2',
      title: '두 번째 손님',
      description: '오후, 노부부가 천천히 계단을 올라와. 오늘이 결혼 40주년이래.',
      lines: [
        { if: 'memo', text: '3호실 문틈엔 여행자가 남긴 쪽지가 있어. "차 고마워요. 메모도요."' },
        { if: 'cookie', text: '여행자는 빈 쿠키 접시를 들고 내려와 엄지를 들어 보였어.' },
      ],
      choices: [
        { label: '저녁 식탁에 작은 꽃을 둔다', next: 'blackout', flag: 'flower' },
        { label: '노을이 잘 보이는 테라스를 알려준다', next: 'blackout', flag: 'sunset' },
      ],
    },
    {
      id: 'blackout',
      title: '예상하지 못한 일',
      description: '저녁 무렵, 갑자기 정전이 됐어. 로비가 깜깜해지고 손님들이 하나둘 내려와.',
      lines: [
        { if: 'flower', text: '노부부는 꽃병 옆에서 손을 꼭 잡고 있어.' },
        { if: 'sunset', text: '노부부는 막 노을을 다 보고 테라스에서 들어온 참이야.' },
      ],
      choices: [
        { label: '초를 켜고 로비에 모두 모인다', next: 'closing', flag: 'candle' },
        { label: '손전등을 들고 방마다 안부를 묻는다', next: 'closing', flag: 'rounds' },
      ],
    },
    {
      id: 'closing',
      title: '하루 마감',
      description: '삼십 분 뒤 불이 다시 들어왔어. 프런트 장부를 덮으며 오늘을 돌아봐.',
      lines: [
        { if: 'candle', text: '촛불 아래서 처음 만난 손님들이 여행 이야기를 나눴어. 여행자는 노부부의 사진을 찍어줬지.' },
        { if: 'rounds', text: '문을 두드릴 때마다 "괜찮아요, 덕분에요"라는 말이 돌아왔어.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'candle', when: ['candle'], title: '촛불 아래 로비', message: '깜깜한 밤이 오히려 따뜻한 저녁이 됐어.' },
    { id: 'rounds', when: ['rounds'], title: '조용히 지킨 밤', message: '오늘 밤 손님들은 모두 편히 잠들었어.' },
    { id: 'default', title: '작은 호텔의 하루', message: '오늘은 바닷가 호텔에서 하루를 보내고 왔어.' },
  ],
};
