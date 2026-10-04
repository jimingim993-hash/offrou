import type { RestProgramId } from '@/types/offrou';

/**
 * 실행형 REST 프로그램 (12단계).
 * 하나의 RestEngine(src/features/rest)이 이 데이터만 보고 그린다:
 * 짧은 안내 → 시작(타이머는 고를 때만) → 조용한 휴식 화면 → 원할 때 종료.
 * 효과(치료·스트레스·수면)를 약속하는 말, 점수·목표·연속 기록은 쓰지 않는다.
 */
export interface RestTimerOption {
  label: string;
  seconds: number;
}

export interface RestProgram {
  id: RestProgramId;
  /** 시작 전 짧은 안내 (큰 글씨 한 문장) */
  intro: string;
  /** 안내 아래 작은 보충 문장 */
  note?: string;
  /** 타이머 선택지 */
  timers?: RestTimerOption[];
  /** 타이머 없이 시작하는 버튼 */
  untimedLabel?: string;
  /** 쉬는 동안 보이는 조용한 문장 */
  restText: string;
  /** 단계형(창밖 보기·스트레칭): 한 번에 한 문장 */
  steps?: string[];
  /** 안전 안내 (스트레칭 등) */
  safety?: string;
  /** 타이머가 끝났을 때의 짧은 문장 */
  afterTimer?: string;
  /** "조금 더"를 누르면 이만큼 더 (초) */
  moreSeconds?: number;
  /** 끝내는 버튼 문구 */
  endLabel: string;
  /** 다른 끝내기 문구 (예: 다 마셨어) */
  altEndLabel?: string;
  /** 바로 끝내기 (자기 전: 오늘은 바로 종료할래) */
  quickExit?: { label: string; message: string };
  /** 편안한 색 하나를 랜덤으로 건넨다 (한 가지 색 보기) */
  calmColor?: boolean;
  /** 화면을 눌러야 선택지가 보인다 (그냥 여기 있기) */
  tapToReveal?: boolean;
  /** 화면을 더 어둡게 (불 끄고·자기 전) */
  dim?: boolean;
  completionMessage: string;
}

export const CALM_COLORS = [
  { name: '초록색', swatch: '#6E9B7B' },
  { name: '하늘색', swatch: '#8FB8D8' },
  { name: '베이지색', swatch: '#D9C7A7' },
  { name: '연보라색', swatch: '#B4A7D1' },
  { name: '파란색', swatch: '#5B7FB0' },
  { name: '하얀색', swatch: '#F2F0EA' },
] as const;

const min = (n: number): RestTimerOption => ({ label: `${n}분`, seconds: n * 60 });

export const REST_PROGRAMS: RestProgram[] = [
  {
    id: 'nothing-3',
    intro: '3분 동안 아무것도 하지 않아도 돼.',
    timers: [{ label: '3분 시작', seconds: 180 }],
    untimedLabel: '시간 없이 쉴래',
    restText: '아무것도 안 해도 돼.',
    afterTimer: '잠깐 멈춰 있었어.',
    endLabel: '여기까지',
    completionMessage: '잠깐 멈춰 있었어.',
  },
  {
    id: 'phone-down',
    intro: '휴대폰을 잠깐 뒤집어 놓아볼까?',
    note: '시간을 고르고 화면을 뒤집어 놓아. OFFROU는 화면을 확인하지 않아.',
    timers: [min(1), min(3), min(5)],
    restText: '뒤집어 놓고 쉬어. 시간이 되면 다시 봐도 돼.',
    afterTimer: '다시 왔네.',
    endLabel: '여기까지',
    completionMessage: '화면 없이 잠깐 있었어.',
  },
  {
    id: 'window',
    intro: '창문이나 먼 곳을 잠깐 바라보자.',
    restText: '천천히 봐도 돼.',
    steps: ['창문이나 먼 곳을 한번 바라봐.', '움직이는 것 하나를 찾아봐.', '조금 더 멀리 있는 것을 바라봐.'],
    endLabel: '여기까지',
    completionMessage: '잠깐 먼 곳에 다녀왔어.',
  },
  {
    id: 'one-color',
    intro: '오늘은 한 가지 색을 잠깐 찾아볼까?',
    note: '몇 개를 찾는지는 상관없어. 천천히 보기만 하면 돼.',
    untimedLabel: '천천히 찾아볼래',
    restText: '서두르지 않아도 돼. 그 색이 보이면 잠깐 바라봐.',
    calmColor: true,
    endLabel: '여기까지',
    completionMessage: '한 가지 색에 잠깐 머물렀어.',
  },
  {
    id: 'sit',
    intro: '어디든 편한 곳에 잠깐 앉아 있어.',
    timers: [min(3), min(5)],
    untimedLabel: '시간 없이',
    restText: '그냥 앉아 있으면 돼.',
    afterTimer: '시간이 됐어. 더 앉아 있어도 괜찮아.',
    endLabel: '여기까지',
    completionMessage: '잠깐 조용히 앉아 있었어.',
  },
  {
    id: 'eyes',
    intro: '화면을 오래 봤다면 잠깐 먼 곳을 바라봐.',
    note: '화면은 계속 보지 않아도 돼. 1분이 지나면 다시 봐.',
    timers: [{ label: '1분 시작', seconds: 60 }],
    restText: '먼 곳을 바라봐. 화면은 안 봐도 돼.',
    afterTimer: '1분 지났어.',
    moreSeconds: 60,
    endLabel: '여기까지',
    completionMessage: '눈이 잠깐 먼 곳에 다녀왔어.',
  },
  {
    id: 'sounds',
    intro: '30초 동안 주변에서 들리는 소리를 그냥 들어봐.',
    note: '마이크를 쓰거나 녹음하지 않아.',
    timers: [{ label: '30초 시작', seconds: 30 }],
    restText: '들리는 대로 그냥 들어.',
    afterTimer: '어떤 소리가 들렸어? 답하지 않아도 돼.',
    moreSeconds: 30,
    endLabel: '여기까지',
    completionMessage: '늘 있던 소리를 잠깐 들었어.',
  },
  {
    id: 'warm-drink',
    intro: '마실 것이 있다면 천천히 한 잔 마셔볼까?',
    note: '물 한 잔이어도 좋아.',
    untimedLabel: '천천히 마실래',
    restText: '한 모금씩, 천천히.',
    endLabel: '여기까지',
    altEndLabel: '다 마셨어',
    completionMessage: '한 잔만큼 천천히 쉬었어.',
  },
  {
    id: 'stretch',
    intro: '아주 가볍게 몸을 풀어볼까?',
    safety: '불편하면 바로 그만둬도 돼. 아프게 할 필요는 없어.',
    restText: '천천히, 편한 만큼만.',
    steps: [
      '어깨를 천천히 위로 올렸다가 내려놔. 두세 번.',
      '두 손을 쫙 폈다가 가볍게 쥐어봐.',
      '자리에서 두 팔을 위로 올려 몸을 한번 늘여봐.',
    ],
    endLabel: '여기까지',
    completionMessage: '몸이 조금 가벼워졌을지도 몰라.',
  },
  {
    id: 'lights-down',
    intro: '안전한 곳이라면 방 조명을 조금 낮추고 잠깐 있어볼까?',
    note: '조명은 직접 낮춰줘. 어두워서 위험한 곳이라면 그대로 있어도 돼.',
    timers: [min(3), min(5)],
    untimedLabel: '시간 없이 있을래',
    restText: '조용함이 방 안에 퍼지게 둬.',
    afterTimer: '시간이 됐어. 더 있어도 괜찮아.',
    dim: true,
    endLabel: '여기까지',
    completionMessage: '어둑한 방에서 잠깐 쉬었어.',
  },
  {
    id: 'bedtime',
    intro: 'OFFROU도 잠깐 내려놓을 시간이야.',
    timers: [{ label: '3분 쉬고 갈래', seconds: 180 }],
    quickExit: { label: '오늘은 바로 종료할래', message: '오늘은 여기까지. 잘 자.' },
    restText: '화면 밝기를 낮춰도 좋아. 3분 뒤에 화면을 꺼도 돼.',
    afterTimer: '이제 화면을 꺼도 돼.',
    dim: true,
    endLabel: '이제 끌게',
    completionMessage: '오늘은 여기까지. 잘 자.',
  },
  {
    id: 'just-here',
    intro: '아무것도 안 해도 돼.',
    untimedLabel: '여기 있을래',
    restText: '여기 있어도 돼.',
    tapToReveal: true,
    endLabel: '이제 갈래',
    completionMessage: '그냥 여기 있었어. 그걸로 충분해.',
  },
];

export const getRestProgram = (id: RestProgramId | string | undefined) => REST_PROGRAMS.find((p) => p.id === id);
