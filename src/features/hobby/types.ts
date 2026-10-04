import type { HobbyProgram } from '@/data/hobby/types';

/** 각 HOBBY 실행 화면이 받는 공통 props */
export interface HobbyViewProps {
  program: HobbyProgram;
  /** 끝까지 했을 때 (완료 기록은 공통 진행 화면이 맡는다) */
  onDone: () => void;
}
