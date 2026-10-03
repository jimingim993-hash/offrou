import type { InteractiveStory, StoryChoice, StoryEnding, StoryScene } from '@/types/story';

/**
 * 인터랙티브 EXPERIENCE 공통 엔진 (순수 함수).
 * 화면(StoryRunner)은 이 함수들로 상태만 바꾸고, 이야기마다 별도 코드를 두지 않는다.
 */
export interface StoryState {
  /** 지나온 장면 id (현재 장면이 마지막) */
  path: string[];
  /** 지금까지 고른 선택지의 플래그 */
  flags: string[];
}

export const startStory = (story: InteractiveStory): StoryState => ({ path: [story.start], flags: [] });

export const findScene = (story: InteractiveStory, id: string | undefined): StoryScene | undefined =>
  story.scenes.find((s) => s.id === id);

export const currentSceneId = (state: StoryState) => state.path[state.path.length - 1];

export function choose(state: StoryState, choice: StoryChoice): StoryState {
  return {
    path: [...state.path, choice.next],
    flags: choice.flag ? [...state.flags, choice.flag] : state.flags,
  };
}

/** 선택지 없는 장면에서 다음으로 */
export function advance(state: StoryState, scene: StoryScene): StoryState {
  return scene.next ? { ...state, path: [...state.path, scene.next] } : state;
}

/** 현재 플래그로 보여줄 대사만 */
export const visibleLines = (scene: StoryScene, flags: string[]) =>
  (scene.lines ?? []).filter((l) => !l.if || flags.includes(l.if));

/** 조건을 모두 만족하는 첫 결말, 없으면 기본 결말 */
export function resolveEnding(story: InteractiveStory, flags: string[]): StoryEnding | undefined {
  return (
    story.endings.find((e) => e.when?.length && e.when.every((f) => flags.includes(f))) ??
    story.endings.find((e) => !e.when?.length)
  );
}

/** 시작부터 결말까지 가장 긴 장면 수 (진행 표시용) */
export function storyLength(story: InteractiveStory): number {
  const memo = new Map<string, number>();
  const depth = (id: string, seen: Set<string>): number => {
    if (memo.has(id)) return memo.get(id)!;
    const scene = findScene(story, id);
    if (!scene || seen.has(id)) return 0;
    const nextIds = [...(scene.choices ?? []).map((c) => c.next), ...(scene.next ? [scene.next] : [])];
    const nextSeen = new Set(seen).add(id);
    const d = 1 + Math.max(0, ...nextIds.map((n) => depth(n, nextSeen)));
    memo.set(id, d);
    return d;
  };
  return depth(story.start, new Set());
}

/** 데이터 검사: 끊긴 장면, 막다른 장면, 기본 결말 누락 등을 찾아 문장으로 돌려준다 */
export function validateStory(story: InteractiveStory): string[] {
  const errors: string[] = [];
  const ids = new Set(story.scenes.map((s) => s.id));
  if (ids.size !== story.scenes.length) errors.push('장면 id 중복');
  if (!ids.has(story.start)) errors.push(`시작 장면 없음: ${story.start}`);
  for (const s of story.scenes) {
    for (const c of s.choices ?? []) if (!ids.has(c.next)) errors.push(`${s.id} → 없는 장면 ${c.next}`);
    if (s.next && !ids.has(s.next)) errors.push(`${s.id} → 없는 장면 ${s.next}`);
    if (!s.isEnding && !s.choices?.length && !s.next) errors.push(`${s.id}: 다음 장면이 없음`);
  }
  if (!story.scenes.some((s) => s.isEnding)) errors.push('마지막 장면 없음');
  if (!story.endings.some((e) => !e.when?.length)) errors.push('기본 결말 없음');
  return errors;
}
