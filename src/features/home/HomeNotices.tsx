import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreVersion } from '@/hooks/useStoreVersion';
import { STORAGE_KEYS, isObject, readJson, writeJson } from '@/services/storage';
import { clearCourseResume, clearStoryResume, latestResume } from '@/services/resume';
import { getExperience, getStory } from '@/services/experiences';
import { storyLength } from '@/features/experience/story/engine';
import { buildCourse } from '@/services/course';
import { courseStepPath } from '@/features/course/courseParams';
import { playPath } from '@/features/experience/paths';
import styles from './HomePage.module.css';

/* ─── 처음 사용 안내 (한 번만) ─── */

export const hasSeenOnboarding = () => readJson<unknown>(STORAGE_KEYS.onboarding, null, isObject) !== null;
export const markOnboardingSeen = (by: 'start' | 'close') =>
  writeJson(STORAGE_KEYS.onboarding, { seenAt: new Date().toISOString(), by });

/**
 * 처음 /app에 들어온 사람에게만 아주 짧게. 회원가입·개인정보를 묻지 않는다.
 * 닫거나 시작하면 다시 보이지 않는다. 기존 사용자는 업데이트 때 저장 구조 마이그레이션이 '봤음'으로 표시한다.
 */
export function Onboarding({ onStart }: { onStart: () => void }) {
  useStoreVersion();
  if (hasSeenOnboarding()) return null;
  return (
    <section className={styles.onboarding} aria-label="처음 사용 안내">
      <p className={styles.onboardingText}>
        지금 필요한 시간을 골라봐.
        <br />
        OFFROU가 오늘의 다른 시간을 하나 골라줄게.
      </p>
      <div className={styles.onboardingActions}>
        <button
          type="button"
          className={styles.onboardingStart}
          onClick={() => {
            markOnboardingSeen('start');
            onStart();
          }}
        >
          바로 시작하기
        </button>
        <button type="button" className={styles.onboardingClose} aria-label="안내 닫기" onClick={() => markOnboardingSeen('close')}>
          ✕
        </button>
      </div>
    </section>
  );
}

/* ─── 하던 OFFROU 이어하기 ─── */

/** 진행 중인 이야기·작은 코스가 있을 때만 작은 카드 하나 */
export function ResumeCard() {
  useStoreVersion();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const latest = latestResume();
  if (!latest || hidden) return null;

  if (latest.kind === 'story') {
    const { story: r } = latest;
    const experience = getExperience(r.experienceId);
    const story = getStory(r.experienceId);
    if (!experience || !story) return null;
    const total = storyLength(story);
    const left = Math.max(1, Math.round((story.estimatedMinutes * Math.max(0, total - r.path.length + 1)) / total));
    return (
      <section className={styles.resume} aria-labelledby="resume-title">
        <p className={styles.resumeEyebrow}>아까 하던 시간</p>
        <h2 id="resume-title" className={styles.resumeTitle}>
          {experience.title}
        </h2>
        <p className={styles.resumeMeta}>{`약 ${left}분 남았어`}</p>
        <div className={styles.resumeActions}>
          <button type="button" className={styles.resumePrimary} onClick={() => navigate(`${playPath(experience.id)}?resume=1`)}>
            이어하기
          </button>
          <button
            type="button"
            className={styles.resumeSecondary}
            onClick={() => {
              clearStoryResume(experience.id);
              navigate(playPath(experience.id));
            }}
          >
            처음부터
          </button>
          <button type="button" className={styles.resumeQuiet} onClick={() => setHidden(true)}>
            지금은 안 할래
          </button>
        </div>
      </section>
    );
  }

  const { course: c } = latest;
  const course = buildCourse(c.vibe, c.minutes, c.stepIds);
  if (!course || c.step >= course.stepIds.length) return null;
  const next = getExperience(course.stepIds[c.step]);
  return (
    <section className={styles.resume} aria-labelledby="resume-title">
      <p className={styles.resumeEyebrow}>아까 하던 작은 OFFROU 코스가 있어.</p>
      <h2 id="resume-title" className={styles.resumeTitle}>
        {course.title}
      </h2>
      <p className={styles.resumeMeta}>{`${c.step + 1} / ${course.stepIds.length} · 다음: ${next?.title ?? ''}`}</p>
      <div className={styles.resumeActions}>
        <button type="button" className={styles.resumePrimary} onClick={() => navigate(courseStepPath(course, c.step, c.runId))}>
          이어하기
        </button>
        <button type="button" className={styles.resumeSecondary} onClick={() => clearCourseResume(c.runId)}>
          그만둘래
        </button>
      </div>
    </section>
  );
}
