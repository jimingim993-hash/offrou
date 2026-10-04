/**
 * OFFROU 도메인 타입.
 * 화면 코드와 분리되어 있어, 이후 API/DB 스키마로 그대로 확장할 수 있다.
 */

/** HOME에서 고르는 "지금 필요한 시간"의 종류 */
export type MoodId = 'rest' | 'anything' | 'new' | 'play' | 'out' | 'bedtime';

export interface Mood {
  id: MoodId;
  label: string;
  /** 카드에 표시할 가벼운 심볼 (이모지 등) */
  symbol: string;
}

/** 사용 가능한 시간 */
export type DurationId = '5m' | '10m' | '30m' | '1h' | 'any';

export interface DurationOption {
  id: DurationId;
  label: string;
  /** 분 단위. '상관없어'는 null */
  minutes: number | null;
}

/** 발견 화면의 경험 카테고리 */
export type CategoryId = 'rest' | 'play' | 'hobby' | 'experience' | 'out';

export interface Category {
  id: CategoryId;
  /** 영문 코드명 (REST, PLAY …) */
  code: string;
  /** 한글 이름 */
  name: string;
  /** 짧은 한 줄 설명 */
  tagline: string;
  /** 발견 화면에서 코드와 함께 보여주는 한글 설명 (쉬어가는 시간 …) */
  short: string;
  /** 공식 홈페이지에서 영역을 소개하는 한 문장 */
  intro: string;
  symbol: string;
}

/** 경험이 가능한 장소 조건 */
export type PlaceId = 'home' | 'anywhere' | 'outside';

/** OUT 등에서 표시하는 비용 수준 */
export type CostLevel = 'free' | 'optional' | 'low';

/** REST 실행 화면의 배경 분위기 */
export type RestTone = 'sky' | 'dusk' | 'night' | 'warm';

/** 실행형 PLAY 프로그램 id (src/data/play/programs.ts) */
export type PlayProgramId =
  | 'three-words'
  | 'small-choice'
  | 'color-find'
  | 'one-minute-doodle'
  | 'photo-mission'
  | 'observe-30'
  | 'random-question'
  | 'memory-5s'
  | 'emoji-story'
  | 'sound-find';

/** 실행형 REST 프로그램 id (src/data/rest/programs.ts) */
export type RestProgramId =
  | 'nothing-3'
  | 'phone-down'
  | 'window'
  | 'one-color'
  | 'sit'
  | 'eyes'
  | 'sounds'
  | 'warm-drink'
  | 'stretch'
  | 'lights-down'
  | 'bedtime'
  | 'just-here';

/** 실행형 HOBBY 프로그램 id (src/data/hobby/programs.ts) */
export type HobbyProgramId =
  | 'drawing'
  | 'writing'
  | 'photo'
  | 'music'
  | 'handwriting'
  | 'paper'
  | 'collage'
  | 'observe-sketch'
  | 'short-story'
  | 'playlist'
  | 'color-combo'
  | 'one-card';

/** PLAY 실행 화면의 한 단계: 할 일 한 문장 + 누르면 다음으로 가는 짧은 대답 */
export interface PlayPrompt {
  /** {변수} 자리는 vars에서 하나를 골라 채운다 */
  text: string;
  action: string;
}

/**
 * 경험을 어떤 화면으로 실행할지. 진행 화면은 type에 맞는 실행기를 골라 그린다.
 * - guide: 진행 방법 목록 (기본, OUT)
 * - rest: 문장과 배경만 있는 쉬는 화면 + 선택형 타이머 (REST)
 * - prompts: 한 번에 하나씩 할 일을 건네는 짧은 상호작용 (PLAY)
 * - focus: 오늘의 주제 하나를 건네고 바로 시작 (HOBBY)
 * - story: 장면·선택지로 진행하는 인터랙티브 이야기 (EXPERIENCE)
 * - play: OFFROU 안에서 바로 하는 실행형 놀이 (PLAY, 10단계). 프로그램 데이터는 src/data/play
 * - hobby: 5~15분 직접 해보는 취미 맛보기 (HOBBY, 11단계). 프로그램 데이터는 src/data/hobby
 */
export type Interaction =
  | { type: 'guide'; /** 실행형 OUT 프로그램 (14단계, src/data/out). 없으면 진행 방법 목록 */ program?: string }
  | {
      type: 'rest';
      prompt: string;
      tone: RestTone;
      /** 천천히 하나씩 보여줄 짧은 문장 */
      lines?: string[];
      /** 실행형 REST 프로그램 (12단계, src/data/rest). 없으면 문장 + 선택형 타이머 화면 */
      program?: RestProgramId;
    }
  | { type: 'prompts'; prompts: PlayPrompt[]; vars?: Record<string, string[]> }
  | { type: 'focus'; label: string; subjects: string[] }
  | { type: 'story'; storyId: string }
  | { type: 'play'; program: PlayProgramId }
  | { type: 'hobby'; program: HobbyProgramId };

export type InteractionType = Interaction['type'];

/**
 * 하나의 OFFROU 경험 콘텐츠 (메타데이터 + 추천용 정보).
 * 지금은 src/data/experiences의 정적 데이터가 채우며, 이후 콘텐츠 API가 같은 형태를 반환한다.
 * 인터랙티브 장면 데이터는 src/data/stories에 따로 둔다.
 */
export interface Experience {
  id: string;
  categoryId: CategoryId;
  /** 짧은 제목 (목록·MY 기록용) */
  title: string;
  /** 경험 고유 심볼. 없으면 카테고리 심볼을 쓴다 */
  symbol?: string;
  /** 추천 화면의 건네는 한 문장 */
  invite: string;
  /** 짧은 설명 */
  summary: string;
  /** 검색·탐색 보조용 키워드 (화면에 전부 노출하지 않는다) */
  tags: string[];
  /** 추천 가능한 상태. '아무거나 해볼래'는 모든 경험이 대상이라 따로 적지 않는다. */
  moods: Exclude<MoodId, 'anything'>[];
  /** 예상 소요 시간(분) */
  minutes: number;
  place: PlaceId;
  /** 준비물. 없으면 빈 배열 */
  supplies: string[];
  /** 진행 방법 */
  steps: string[];
  /** 완료 후 짧은 메시지 */
  doneMessage: string;
  /** 비용 수준 (밖에서 하는 경험 위주) */
  cost?: CostLevel;
  /** 혼자서도 할 수 있는지 */
  solo?: boolean;
  /** 실행 방식. 없으면 guide */
  interaction?: Interaction;
  /**
   * 콘텐츠 버전 (없으면 1). 장면 구조·주요 단계·진행 방식이 바뀔 때만 올린다 (오탈자 수정은 그대로).
   * id는 바꾸지 않는다 — 저장·기록은 id로 연결된다. 사용자 저장 구조 버전(storageVersion)과는 별개다.
   */
  version?: number;
}

/** MY에 쌓이는 경험 기록. 선택 내용 전체는 저장하지 않는다. */
export interface OffrouRecord {
  id: string;
  experienceId: string;
  title: string;
  categoryId: CategoryId;
  minutes: number;
  /** ISO 날짜 문자열 */
  completedAt: string;
  /** HOME 추천으로 시작했을 때만 기록된다 */
  moodId?: MoodId;
  durationId?: DurationId;
  /** 실행 방식 */
  kind?: InteractionType;
  /** 이야기 경험의 결말 제목 */
  endingTitle?: string;
  /** 작은 코스 안에서 완료했다면 그 코스 진행 id (MY에서 코스 하나로 묶어 보여준다) */
  courseRunId?: string;
  /** 완료할 때의 콘텐츠 버전 (16단계부터, 이전 기록에는 없다) */
  contentVersion?: number;
}

/* ─── 개인화 (4단계) ─── */

/** 완료 후 가벼운 피드백: 좋았어 / 그냥 그랬어 */
export type FeedbackValue = 'good' | 'meh';

export interface FeedbackEntry {
  recordId: string;
  experienceId: string;
  categoryId: CategoryId;
  value: FeedbackValue;
  /** ISO 날짜 문자열 */
  at: string;
}

/** 추천에 쓰는 최소한의 사용 신호 */
export interface ActivitySignals {
  /** 최근 추천으로 보여준 경험 id (오래된 것 → 최근) */
  recentShown: string[];
  /** "다른 시간 보기"로 넘긴 횟수 */
  skipped: Record<string, number>;
  /** 시작한 횟수 */
  started: Record<string, number>;
  /** 상세를 열어봤지만 아직 시작하지 않은 경험 (최근 것이 앞, 최대 5개) */
  recentViewed: string[];
}

/** 추천 엔진이 참고하는 사용자 기록 묶음 (모두 이 기기 안의 데이터) */
export interface UserHistory {
  records: OffrouRecord[];
  feedback: FeedbackEntry[];
  activity: ActivitySignals;
}

/** usual: 평소 추천 / fresh: "평소와 조금 다른" 시간 */
export type RecommendMode = 'usual' | 'fresh';
