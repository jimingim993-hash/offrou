import { useState, type ComponentType } from 'react';
import { getHobbyProgram } from '@/data/hobby/programs';
import type { HobbyKind } from '@/data/hobby/types';
import { formatMinutes } from '@/data/durations';
import { FocusRunner } from '@/features/experience/runners/FocusRunner';
import type { RunnerProps } from '@/features/experience/runners/types';
import { Actions, PlayButton } from '@/features/play/parts';
import type { HobbyViewProps } from './types';
import { DrawingHobby, HandwritingHobby, ObserveSketchHobby, StoryHobby, WritingHobby } from './programs/CreateHobbies';
import { CollageHobby, MusicHobby, PaperHobby, PhotoHobby, PlaylistHobby } from './programs/FindHobbies';
import { ColorComboHobby, OneCardHobby } from './programs/DesignHobbies';
import styles from '@/features/play/play.module.css';
import own from './hobby.module.css';

/** 프로그램 종류별 실행 화면. 새 종류는 여기에 등록한다. */
export const HOBBY_VIEWS: Record<HobbyKind, ComponentType<HobbyViewProps>> = {
  draw: DrawingHobby,
  write: WritingHobby,
  photo: PhotoHobby,
  music: MusicHobby,
  handwriting: HandwritingHobby,
  paper: PaperHobby,
  collage: CollageHobby,
  'observe-sketch': ObserveSketchHobby,
  story: StoryHobby,
  playlist: PlaylistHobby,
  color: ColorComboHobby,
  card: OneCardHobby,
};

/**
 * HOBBY 엔진. 소개(준비물·예상 시간) → 시작 → 프로그램 화면 → 완료.
 * 완료·기록·나가기·코스 이동은 공통 진행 화면(ExperiencePlayPage)이 맡는다.
 * 타이머·캔버스·랜덤·버튼은 PLAY 엔진의 공통 부품을 그대로 쓴다.
 * 프로그램을 찾지 못하면 기존 "오늘의 주제" 화면(FocusRunner)으로 안전하게 보여준다.
 */
export function HobbyRunner({ experience, onFinish }: RunnerProps) {
  const interaction = experience.interaction?.type === 'hobby' ? experience.interaction : undefined;
  const program = getHobbyProgram(interaction?.program);
  const [started, setStarted] = useState(false);
  if (!program) return <FocusRunner experience={experience} onFinish={onFinish} />;

  const View = HOBBY_VIEWS[program.kind];
  const done = () => onFinish({ message: program.completionMessage });
  const supplies = experience.supplies.length ? `필요한 것: ${experience.supplies.join(' + ')}` : '준비물 없음 · 휴대폰만 있으면 돼';

  return (
    <section className={styles.play} aria-label="취미 맛보기">
      {!started ? (
        <div className={styles.stage}>
          <p className={own.taste}>{`${experience.minutes}분만 해보기`}</p>
          <p className={styles.lead}>{program.intro}</p>
          <ul className={own.meta} aria-label="시작 전에">
            <li>{formatMinutes(experience.minutes)}</li>
            <li>{supplies}</li>
          </ul>
          <Actions>
            <PlayButton onClick={() => setStarted(true)}>시작</PlayButton>
          </Actions>
        </div>
      ) : (
        <div className={styles.stage}>
          <View program={program} onDone={done} />
        </div>
      )}
      <button type="button" className={styles.stop} onClick={done}>
        여기까지만 할래
      </button>
    </section>
  );
}
