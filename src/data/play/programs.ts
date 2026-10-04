import type { PlayProgramId } from '@/types/offrou';
import type { PlayProgram } from './types';

/** 실행형 PLAY 프로그램 10개. 어떤 경험이 어떤 프로그램을 쓰는지는 data/experiences/play.ts가 정한다. */
export const PLAY_PROGRAMS: PlayProgram[] = [
  {
    id: 'three-words',
    kind: 'words',
    intro: '서로 관계없는 단어 세 개로 짧은 이야기를 상상해보자.',
    instruction: '세 단어가 모두 들어가는 이야기를 만들어봐.',
    completionMessage: '평소에는 만나지 않았을 세 단어가 잠깐 같은 이야기에 있었네.',
  },
  {
    id: 'small-choice',
    kind: 'choice',
    intro: '정답 없는 가벼운 질문 하나. 둘 중 하나만 골라봐.',
    instruction: '하나만 골라봐.',
    completionMessage: '정답 없는 선택을 몇 번 해봤어. 그냥 재밌었으면 됐어.',
  },
  {
    id: 'color-find',
    kind: 'find',
    intro: '색 하나를 정해서 주변에서 찾아보자.',
    instruction: '주변에서 이 색 물건을 3개 찾아보자.',
    seconds: 60,
    ask: { question: '몇 개 찾았어?', answers: ['1개', '2개', '3개 이상'] },
    completionMessage: '평소엔 지나쳤던 색이 조금 더 잘 보였을지도 몰라.',
  },
  {
    id: 'one-minute-doodle',
    kind: 'draw',
    intro: '1분만 아무거나 그려볼까? 잘 그릴 필요 없어.',
    instruction: '손가락이나 마우스로 화면에 그려봐.',
    seconds: 60,
    completionMessage: '1분 동안 세상에 하나뿐인 그림이 생겼어.',
  },
  {
    id: 'photo-mission',
    kind: 'photo',
    intro: '오늘의 사진 미션 하나. 사진은 안 찍어도 괜찮아.',
    instruction: '주변에서 찾아봐. 찍고 싶으면 찍어도 좋아.',
    completionMessage: '익숙한 곳에서 미션 하나를 찾아냈어.',
  },
  {
    id: 'observe-30',
    kind: 'observe',
    intro: '30초만 주변을 볼까? 휴대폰 화면 말고 주변을 한번 봐.',
    instruction: '휴대폰 화면 말고 주변을 한번 봐.',
    seconds: 30,
    ask: { question: '아까는 안 보였는데 지금 보인 게 있어?', answers: ['있었어', '잘 모르겠어'] },
    completionMessage: '30초 동안 주변이 조금 다르게 보였을 거야.',
  },
  {
    id: 'random-question',
    kind: 'question',
    intro: '상상하는 질문 하나. 생각만 해도 되고 적어도 돼.',
    instruction: '떠오르는 대로 상상해봐. 맞는 답은 없어.',
    completionMessage: '오늘 너만의 대답이 하나 생겼어.',
  },
  {
    id: 'memory-5s',
    kind: 'memory',
    intro: '그림 몇 개를 5초 동안 보여줄게. 뭐가 있었는지 떠올려보자.',
    instruction: '5초 동안 잘 봐둬.',
    seconds: 5,
    completionMessage: '잠깐 집중했던 5초였어.',
  },
  {
    id: 'emoji-story',
    kind: 'emoji',
    intro: '이모지 몇 개로 무슨 일이 있었는지 상상해보자.',
    instruction: '이걸로 무슨 일이 있었는지 상상해봐.',
    completionMessage: '이모지 몇 개로 작은 이야기가 하나 생겼어.',
  },
  {
    id: 'sound-find',
    kind: 'listen',
    intro: '잠깐 귀를 기울여봐. 녹음하지 않아.',
    instruction: '30초 동안 주변에서 들리는 소리를 세 가지 찾아봐.',
    seconds: 30,
    ask: { question: '어떤 소리가 들렸어?', answers: [] },
    completionMessage: '늘 있던 소리들이 잠깐 또렷하게 들렸어.',
  },
];

export const getPlayProgram = (id: PlayProgramId | string | undefined) => PLAY_PROGRAMS.find((p) => p.id === id);
