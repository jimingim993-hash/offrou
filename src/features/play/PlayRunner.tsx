import type { ComponentType } from 'react';
import { getPlayProgram } from '@/data/play/programs';
import type { PlayKind } from '@/data/play/types';
import { formatMinutes } from '@/data/durations';
import { GuideRunner } from '@/features/experience/runners/GuideRunner';
import type { RunnerProps } from '@/features/experience/runners/types';
import type { PlayViewProps } from './parts';
import { WordsPlay } from './programs/WordsPlay';
import { ChoicePlay } from './programs/ChoicePlay';
import { FindColorPlay } from './programs/FindColorPlay';
import { DrawPlay } from './programs/DrawPlay';
import { PhotoPlay } from './programs/PhotoPlay';
import { ListenPlay, ObservePlay } from './programs/TimedLookPlay';
import { EmojiPlay, QuestionPlay } from './programs/ImaginePlay';
import { MemoryPlay } from './programs/MemoryPlay';
import styles from './play.module.css';

/** 프로그램 종류별 실행 화면. 새 종류는 여기에 등록한다. */
export const PLAY_VIEWS: Record<PlayKind, ComponentType<PlayViewProps>> = {
  words: WordsPlay,
  choice: ChoicePlay,
  find: FindColorPlay,
  draw: DrawPlay,
  photo: PhotoPlay,
  observe: ObservePlay,
  question: QuestionPlay,
  memory: MemoryPlay,
  emoji: EmojiPlay,
  listen: ListenPlay,
};

/**
 * PLAY 엔진. 경험의 interaction.program으로 프로그램 데이터를 찾아 종류에 맞는 화면을 그린다.
 * 완료·기록·나가기는 공통 진행 화면(ExperiencePlayPage)이 맡는다.
 * 프로그램을 찾지 못하면 기존 안내형 화면으로 안전하게 보여준다.
 */
export function PlayRunner({ experience, onFinish }: RunnerProps) {
  const interaction = experience.interaction?.type === 'play' ? experience.interaction : undefined;
  const program = getPlayProgram(interaction?.program);
  if (!program) return <GuideRunner experience={experience} onFinish={onFinish} />;

  const View = PLAY_VIEWS[program.kind];
  const done = () => onFinish({ message: program.completionMessage });

  return (
    <section className={styles.play} aria-label="바로 놀기">
      <p className={styles.intro}>
        {program.intro} <span className={styles.minutes}>{formatMinutes(experience.minutes)}</span>
      </p>
      <div className={styles.stage}>
        <View program={program} onDone={done} />
      </div>
      <button type="button" className={styles.stop} onClick={done}>
        여기까지만 할래
      </button>
    </section>
  );
}
