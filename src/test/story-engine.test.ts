import { STORIES } from '@/data/stories';
import {
  advance,
  choose,
  currentSceneId,
  findScene,
  resolveEnding,
  startStory,
  storyLength,
  validateStory,
  visibleLines,
} from '@/features/experience/story/engine';
import type { InteractiveStory } from '@/types/story';

/** 첫 번째(또는 지정한) 선택지로 끝까지 진행 */
function playThrough(story: InteractiveStory, pick: (choices: number) => number = () => 0) {
  let state = startStory(story);
  for (let i = 0; i < 20; i++) {
    const scene = findScene(story, currentSceneId(state))!;
    if (scene.isEnding) return { state, scene };
    state = scene.choices?.length ? choose(state, scene.choices[pick(scene.choices.length)]) : advance(state, scene);
  }
  throw new Error('끝나지 않는 이야기');
}

describe('인터랙티브 이야기 데이터', () => {
  it('5개 이상이며 모두 검증을 통과한다', () => {
    expect(STORIES.length).toBeGreaterThanOrEqual(5);
    for (const s of STORIES) expect(validateStory(s), s.experienceId).toEqual([]);
  });

  it('필수 정보와 3~6개의 주요 장면을 가진다', () => {
    for (const s of STORIES) {
      expect(s.title && s.subtitle && s.introduction && s.completionMessage).toBeTruthy();
      expect(s.estimatedMinutes).toBeGreaterThanOrEqual(5);
      expect(s.estimatedMinutes).toBeLessThanOrEqual(15);
      for (const scene of s.scenes) expect(scene.title && scene.description).toBeTruthy();
      expect(storyLength(s)).toBeGreaterThanOrEqual(3);
      expect(storyLength(s)).toBeLessThanOrEqual(6);
    }
  });

  it('모든 선택 경로가 결말에 도착한다', () => {
    for (const s of STORIES) {
      for (const first of [0, 1, 2]) {
        let n = 0;
        const { scene } = playThrough(s, (len) => (n++ === 0 ? Math.min(first, len - 1) : 0));
        expect(scene.isEnding).toBe(true);
      }
    }
  });

  it('선택에 따라 대사나 결말이 달라진다', () => {
    for (const s of STORIES) {
      const a = playThrough(s, () => 0);
      const b = playThrough(s, (len) => len - 1);
      const differ =
        resolveEnding(s, a.state.flags)?.id !== resolveEnding(s, b.state.flags)?.id ||
        visibleLines(a.scene, a.state.flags).map((l) => l.text).join() !==
          visibleLines(b.scene, b.state.flags).map((l) => l.text).join();
      expect(differ, s.experienceId).toBe(true);
    }
  });
});

describe('이야기 엔진', () => {
  const story = STORIES.find((s) => s.experienceId === 'exp-radio-dj')!;

  it('선택지를 고르면 다음 장면과 플래그가 바뀐다', () => {
    let state = startStory(story);
    expect(currentSceneId(state)).toBe('onair');
    state = choose(state, findScene(story, 'onair')!.choices![0]);
    expect(currentSceneId(state)).toBe('letter1');
    state = choose(state, { label: '피아노', next: 'letter2', flag: 'calm' });
    expect(state.flags).toContain('calm');
    const lines = visibleLines(findScene(story, 'letter2')!, state.flags).map((l) => l.text);
    expect(lines.some((t) => t.includes('피아노 덕분에'))).toBe(true);
    expect(lines.some((t) => t.includes('혼자 웃었어요'))).toBe(false);
  });

  it('결말은 플래그에 맞게, 없으면 기본 결말', () => {
    expect(resolveEnding(story, ['calm'])?.title).toBe('조용한 밤의 방송');
    expect(resolveEnding(story, ['rain'])?.title).toBe('빗소리가 흐른 밤');
    expect(resolveEnding(story, [])?.id).toBe('default');
  });

  it('잘못된 장면 id를 찾아낸다', () => {
    const broken: InteractiveStory = {
      ...story,
      scenes: [{ id: 'onair', title: 't', description: 'd', choices: [{ label: 'x', next: 'nowhere' }] }],
    };
    expect(validateStory(broken).join()).toContain('nowhere');
    const state = choose(startStory(broken), broken.scenes[0].choices![0]);
    expect(findScene(broken, currentSceneId(state))).toBeUndefined();
  });
});
