import type { PlayProgramId } from '@/types/offrou';

/**
 * 실행형 PLAY 프로그램 정의.
 * kind가 어떤 실행 화면(src/features/play/programs)으로 그릴지 정하고,
 * 문장·선택지·시간 같은 내용은 여기 데이터로만 둔다.
 */
export type PlayKind =
  | 'words' // 랜덤 단어 → 상상
  | 'choice' // 둘 중 하나 고르기
  | 'find' // 주변에서 찾기 (+선택형 타이머)
  | 'draw' // 캔버스 낙서
  | 'photo' // 사진 미션 (사진 없이도 완료)
  | 'observe' // 타이머 동안 관찰
  | 'question' // 상상 질문
  | 'memory' // 잠깐 보고 기억하기
  | 'emoji' // 이모지 조합 → 상상
  | 'listen'; // 귀 기울이기 (녹음 없음)

export interface PlayProgram {
  id: PlayProgramId;
  kind: PlayKind;
  /** 시작 화면의 짧은 설명 (긴 설명 대신 한두 문장) */
  intro: string;
  /** 진행 중 핵심 안내 */
  instruction: string;
  /** 타이머 길이(초). 타이머가 있는 프로그램만 */
  seconds?: number;
  /** 다 하고 나서 묻는 가벼운 질문과 답 (평가하지 않는다) */
  ask?: { question: string; answers: string[] };
  /** 완료 메시지 */
  completionMessage: string;
}
