import type { HobbyProgramId } from '@/types/offrou';
import type { HobbyProgram } from './types';

/** 실행형 HOBBY 프로그램 12개. 어떤 경험이 어떤 프로그램을 쓰는지는 data/experiences/hobby.ts가 정한다. */
export const HOBBY_PROGRAMS: HobbyProgram[] = [
  {
    id: 'drawing',
    kind: 'draw',
    intro: '주제 하나를 10분 동안 그려보자. 종이에 그려도, 화면에 그려도 돼.',
    instruction: '종이보다 물건을 더 오래 보면서 윤곽을 따라 그려봐.',
    optionalTimerMinutes: 10,
    completionMessage: '한 물건을 이렇게 오래 본 건 처음일지도 몰라.',
  },
  {
    id: 'writing',
    kind: 'write',
    intro: '주제 하나로 5분만 써보자. 적지 않고 머릿속으로만 써도 돼.',
    instruction: '떠오르는 대로 몇 문장만. 고치지 않고 이어서 써봐.',
    optionalTimerMinutes: 5,
    completionMessage: '5분 동안 세상에 없던 글이 조금 생겼어.',
  },
  {
    id: 'photo',
    kind: 'photo',
    intro: '오늘의 사진 주제 하나. 휴대폰 카메라로 찍어도 되고, 찾아보기만 해도 돼.',
    instruction: '주제에 맞는 장면을 찾아 한두 장 찍어봐.',
    optionalTimerMinutes: 10,
    completionMessage: '익숙한 곳을 사진가의 눈으로 잠깐 봤어.',
  },
  {
    id: 'music',
    kind: 'music',
    intro: '평소 쓰는 음악 앱에서 미션 하나에 맞는 곡을 찾아보자. OFFROU는 음악을 틀지 않아.',
    instruction: '찾았으면 한 곡 끝까지 들어봐.',
    completionMessage: '오늘 귀에 새로운 곡이 하나 들어왔어.',
  },
  {
    id: 'handwriting',
    kind: 'handwriting',
    intro: '문장 하나를 종이에 천천히 따라 써보자.',
    instruction: '한 글자씩 천천히. 두 번 써봐도 좋아.',
    completionMessage: '손으로 쓴 한 줄이 남았어.',
  },
  {
    id: 'paper',
    kind: 'paper',
    intro: '종이 한 장으로 만드는 쉬운 활동. 하나 골라서 단계대로 따라 해보자.',
    instruction: '한 단계씩 천천히. 모양이 조금 달라도 괜찮아.',
    completionMessage: '종이 한 장이 다른 무언가가 됐어.',
  },
  {
    id: 'collage',
    kind: 'collage',
    intro: '사진첩에서 사진 세 장을 골라 마음속 콜라주를 만들어보자. 올릴 필요 없어.',
    instruction: '사진첩을 열고 하나씩 골라봐.',
    completionMessage: '세 장의 사진이 오늘의 작은 콜라주가 됐어.',
  },
  {
    id: 'observe-sketch',
    kind: 'observe-sketch',
    intro: '물건 하나를 30초 동안 관찰하고, 특징 세 가지를 떠올린 다음 직접 스케치해보자.',
    instruction: '30초 동안 물건만 바라봐.',
    completionMessage: '오래 본 만큼 물건이 조금 달라 보였을 거야.',
  },
  {
    id: 'short-story',
    kind: 'story',
    intro: '소재 세 개로 3~5문장짜리 짧은 이야기를 만들어보자.',
    instruction: '세 소재가 모두 나오게 3~5문장으로.',
    optionalTimerMinutes: 10,
    completionMessage: '짧은 이야기 하나가 완성됐어.',
  },
  {
    id: 'playlist',
    kind: 'playlist',
    intro: '테마 하나에 맞는 세 곡을 내 음악 앱에서 골라보자. OFFROU는 음악을 틀지 않아.',
    instruction: '한 곡씩 골라봐. 곡 이름은 적어도 되고 안 적어도 돼.',
    completionMessage: '나만 아는 작은 플레이리스트가 생겼어.',
  },
  {
    id: 'color-combo',
    kind: 'color',
    intro: '마음에 드는 색 세 개를 골라 오늘의 색을 만들어보자.',
    instruction: '마음에 드는 색을 세 개 골라봐.',
    completionMessage: '오늘의 색 세 개가 생겼어.',
  },
  {
    id: 'one-card',
    kind: 'card',
    intro: '배경색, 짧은 문장, 글자 정렬만 골라서 카드 한 장을 만들어보자.',
    instruction: '고를 때마다 카드가 바로 바뀌어.',
    completionMessage: '세상에 한 장뿐인 카드를 만들었어.',
  },
];

export const getHobbyProgram = (id: HobbyProgramId | string | undefined) => HOBBY_PROGRAMS.find((p) => p.id === id);
