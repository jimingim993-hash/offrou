import type { Experience } from '@/types/offrou';

export interface RunResult {
  /** 이야기 경험의 결말 */
  endingTitle?: string;
  message?: string;
}

/** 모든 실행기가 받는 공통 props. 나가기·기록·완료 이동은 진행 화면(shell)이 맡는다. */
export interface RunnerProps {
  experience: Experience;
  onFinish: (result?: RunResult) => void;
}
