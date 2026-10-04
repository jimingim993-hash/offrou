/**
 * 인터랙티브 EXPERIENCE 콘텐츠 형식.
 * 화면 코드와 분리되어 있어, 새 이야기는 이 형태의 데이터만 추가하면 공통 엔진으로 실행된다.
 */

/** 선택에 따라 보이는 대사. if가 없으면 항상 보인다. */
export interface StoryLine {
  text: string;
  /** 이 플래그가 선택된 적 있을 때만 표시 */
  if?: string;
}

export interface StoryChoice {
  label: string;
  /** 다음 장면 id */
  next: string;
  /** 고르면 남는 플래그. 이후 대사·결말에 쓰인다 */
  flag?: string;
}

export interface StoryScene {
  id: string;
  /** 장면 제목 */
  title: string;
  /** 장면 설명 */
  description: string;
  lines?: StoryLine[];
  /** 2~3개의 선택지 */
  choices?: StoryChoice[];
  /** 선택지 없이 이어지는 장면의 다음 장면 id */
  next?: string;
  /** 마지막 장면 여부 */
  isEnding?: boolean;
}

/** 결말. when의 플래그를 모두 고른 경우 선택되며, when이 없는 결말은 기본값이다. */
export interface StoryEnding {
  id: string;
  title: string;
  message: string;
  when?: string[];
}

export interface InteractiveStory {
  experienceId: string;
  title: string;
  subtitle: string;
  introduction: string;
  estimatedMinutes: number;
  start: string;
  scenes: StoryScene[];
  endings: StoryEnding[];
  /** 결말 메시지가 없을 때 쓰는 공통 완료 메시지 */
  completionMessage: string;
  /** 이야기 버전 (없으면 1). 장면 구조가 바뀌면 올린다 → 이어하기 호환성 판단에 쓴다 */
  version?: number;
}
