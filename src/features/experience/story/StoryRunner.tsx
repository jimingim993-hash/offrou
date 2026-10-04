import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { getStory } from '@/services/experiences';
import type { InteractiveStory } from '@/types/story';
import type { RunnerProps, RunResult } from '../runners/types';
import { advance, choose, currentSceneId, findScene, resolveEnding, startStory, storyLength, visibleLines, type StoryState } from './engine';
import { clearStoryResume, getStoryResume, saveStoryResume, type StoryResume } from '@/services/resume';
import styles from './StoryRunner.module.css';

/** EXPERIENCE 실행기: 이야기 데이터를 찾아 공통 화면으로 진행한다 */
export function StoryRunner({ experience, onFinish }: RunnerProps) {
  const [params] = useSearchParams();
  const story = experience.interaction?.type === 'story' ? getStory(experience.interaction.storyId) : undefined;
  if (!story) return <Lost onFinish={onFinish} />;
  return <StoryView story={story} onFinish={onFinish} autoResume={params.get('resume') === '1'} />;
}

/** 저장해 둔 진행이 지금 이야기에서 그대로 이어질 수 있는지 (버전·장면 확인) */
export function canResume(story: InteractiveStory, r: StoryResume | undefined): boolean {
  if (!r || r.contentVersion !== (story.version ?? 1)) return false;
  if (r.path[0] !== story.start || !r.path.every((id) => findScene(story, id))) return false;
  return !findScene(story, r.path[r.path.length - 1])?.isEnding;
}

export function StoryView({
  story,
  onFinish,
  autoResume = false,
}: {
  story: InteractiveStory;
  onFinish: (r?: RunResult) => void;
  autoResume?: boolean;
}) {
  // 하던 진행 (16단계): 버전·장면이 맞을 때만 이어간다
  const [saved] = useState(() => getStoryResume(story.experienceId));
  const resumable = canResume(story, saved);
  const [offer, setOffer] = useState(resumable && !autoResume);
  const [started, setStarted] = useState(resumable && autoResume);
  const [state, setState] = useState<StoryState>(() =>
    resumable && autoResume ? { path: saved!.path, flags: saved!.flags } : startStory(story),
  );
  const outdated = !!saved && !resumable && !findScene(story, saved.path[saved.path.length - 1])?.isEnding;
  const total = useMemo(() => storyLength(story), [story]);
  const scene = findScene(story, currentSceneId(state));
  const step = state.path.length;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step, started]);

  // 진행할 때마다 이 기기에 남긴다. 결말에 닿으면(완료) 진행 상태만 지운다.
  useEffect(() => {
    if (!started) return;
    const now = findScene(story, currentSceneId(state));
    if (!now) return;
    if (now.isEnding) clearStoryResume(story.experienceId);
    else saveStoryResume({ experienceId: story.experienceId, contentVersion: story.version ?? 1, path: state.path, flags: state.flags });
  }, [started, state, story]);

  const restart = () => setState(startStory(story));

  if (!started && offer && resumable) {
    return (
      <section className={`${styles.intro} rise`} aria-labelledby="resume-offer">
        <p id="resume-offer" className={styles.introduction}>
          아까 하던 시간을 이어갈래?
        </p>
        <p className={styles.meta}>{`${saved!.path.length} / ${total} 장면까지 했어`}</p>
        <Button
          block
          onClick={() => {
            setState({ path: saved!.path, flags: saved!.flags });
            setStarted(true);
          }}
        >
          이어하기
        </Button>
        <Button
          block
          variant="ghost"
          onClick={() => {
            clearStoryResume(story.experienceId);
            setState(startStory(story));
            setStarted(true);
          }}
        >
          처음부터
        </Button>
        <Button block variant="ghost" onClick={() => setOffer(false)}>
          지금은 안 할래
        </Button>
      </section>
    );
  }

  if (!started) {
    return (
      <section className={`${styles.intro} rise`} aria-labelledby="story-subtitle">
        {outdated && <p className={styles.meta}>이 콘텐츠가 업데이트돼서 처음부터 다시 시작해야 해.</p>}
        <p id="story-subtitle" className={styles.subtitle}>
          {story.subtitle}
        </p>
        <p className={styles.introduction}>{story.introduction}</p>
        <p className={styles.meta}>
          약 {story.estimatedMinutes}분 · 장면 {total}개
        </p>
        <Button
          block
          onClick={() => {
            if (outdated) clearStoryResume(story.experienceId);
            setState(startStory(story));
            setStarted(true);
          }}
        >
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
