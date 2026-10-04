import type { HobbyProgramId } from '@/types/offrou';

/**
 * 실행형 HOBBY 프로그램 정의. kind가 실행 화면(src/features/hobby/programs)을 정하고
 * 주제·문장·단계 같은 내용은 이 데이터(src/data/hobby)에만 둔다.
 */
export type HobbyKind =
  | 'draw' // 주제 → 종이 또는 화면에 그리기
  | 'write' // 주제 → (선택) 글쓰기
  | 'photo' // 사진 주제 → 찍었어 (업로드 없음)
  | 'music' // 음악 탐색 미션 (스트리밍 없음)
  | 'handwriting' // 문장 → 종이에 따라 쓰기
  | 'paper' // 종이 활동 단계별 안내
  | 'collage' // 사진첩에서 하나씩 고르기
  | 'observe-sketch' // 30초 관찰 → 특징 세 가지 → 그리기
  | 'story' // 랜덤 소재 3개 → 짧은 이야기
  | 'playlist' // 테마 → 세 곡 고르기
  | 'color' // 마음에 드는 색 세 개
  | 'card'; // 한 장 디자인

export interface HobbyProgram {
  id: HobbyProgramId;
  kind: HobbyKind;
  /** 시작 전 소개 한두 문장 */
  intro: string;
  /** 진행 중 핵심 안내 */
  instruction: string;
  /** 선택형 타이머(분). 켜고 싶을 때만 */
  optionalTimerMinutes?: number;
  completionMessage: string;
}

/** 종이 활동 하나 */
export interface PaperActivity {
  id: string;
  title: string;
  supplies: string[];
  steps: string[];
}

/** 한 장 디자인·색 조합에 쓰는 이름 있는 색 (색 이름을 항상 글자로 함께 보여준다) */
export interface NamedColor {
  name: string;
  hex: string;
  /** 이 배경 위 글자색 */
  ink: string;
}
