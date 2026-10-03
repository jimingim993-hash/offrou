import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { getStory } from '@/services/experiences';
import type { InteractiveStory } from '@/types/story';
import type { RunnerProps, RunResult } from '../runners/types';
import { advance, choose, currentSceneId, findScene, resolveEnding, startStory, storyLength, visibleLines } from './engine';
import styles from './StoryRunner.module.css';

/** EXPERIENCE 실행기: 이야기 데이터를 찾아 공통 화면으로 진행한다 */
export function StoryRunner({ experience, onFinish }: RunnerProps) {
  const story = experience.interaction?.type === 'story' ? getStory(experience.interaction.storyId) : undefined;
  if (!story) return <Lost onFinish={onFinish} />;
  return <StoryView story={story} onFinish={onFinish} />;
}

export function StoryView({ story, onFinish }: { story: InteractiveStory; onFinish: (r?: RunResult) => void }) {
  const [started, setStarted] = useState(false);
  const [state, setState] = useState(() => startStory(story));
  const total = useMemo(() => storyLength(story), [story]);
  const scene = findScene(story, currentSceneId(state));
  const step = state.path.length;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step, started]);

  const restart = () => setState(startStory(story));

  if (!started) {
    return (
      <section className={`${styles.intro} rise`} aria-labelledby="story-subtitle">
        <p id="story-subtitle" className={styles.subtitle}>
          {story.subtitle}
        </p>
        <p className={styles.introduction}>{story.introduction}</p>
        <p className={styles.meta}>
          약 {story.estimatedMinutes}분 · 장면 {total}개
        </p>
        <Button block onClick={() => setStarted(true)}>
          시작하기
        </Button>
      </section>
    );
  }

  // 데이터가 잘못되어 장면을 찾지 못해도 앱은 멈추지 않는다
  const deadEnd = scene && !scene.isEnding && !scene.choices?.length && !scene.next;
  if (!scene || deadEnd) return <Lost onFinish={onFinish} onRestart={restart} />;

  const ending = scene.isEnding ? resolveEnding(story, state.flags) : undefined;
  const message = ending?.message ?? story.completionMessage;

  return (
    <div className={styles.story}>
      <ProgressDots total={total} current={Math.min(step, total)} />

      <article key={step} className={`${styles.scene} rise`}>
        <h2 className={styles.sceneTitle}>{scene.title}</h2>
        <p>{scene.description}</p>
        {visibleLines(scene, state.flags).map((l) => (
          <p key={l.text} className={styles.line}>
            {l.text}
          </p>
        ))}
      </article>

      {scene.isEnding ? (
        <div className={`${styles.actions} rise`}>
          <div className={styles.ending}>
            <p className={styles.endingLabel}>오늘의 이야기</p>
            <p className={styles.endingTitle}>{ending?.title ?? story.title}</p>
            <p className={styles.endingMessage}>{message}</p>
          </div>
          <Button block onClick={() => onFinish({ endingTitle: ending?.title, message })}>
            이 시간 마치기
          </Button>
          <Button block variant="ghost" onClick={restart}>
            처음부터 다시
          </Button>
        </div>
      ) : scene.choices?.length ? (
        <div className={styles.actions}>
          {scene.choices.map((c) => (
            <button key={c.label} type="button" className={styles.choice} onClick={() => setState(choose(state, c))}>
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.actions}>
          <Button block onClick={() => setState(advance(state, scene))}>
            다음
          </Button>
        </div>
      )}
    </div>
  );
}

function Lost({ onFinish, onRestart }: { onFinish: (r?: RunResult) => void; onRestart?: () => void }) {
  return (
    <section className={styles.lost}>
      <h2 className={styles.sceneTitle}>이야기가 잠깐 길을 잃었어.</h2>
      <p>다음 장면을 찾지 못했어. 여기까지만 해도 괜찮아.</p>
      <div className={styles.actions}>
        <Button block onClick={() => onFinish()}>
          여기서 마치기
        </Button>
        {onRestart && (
          <Button block variant="ghost" onClick={onRestart}>
            처음부터 다시
          </Button>
        )}
      </div>
    </section>
  );
}
