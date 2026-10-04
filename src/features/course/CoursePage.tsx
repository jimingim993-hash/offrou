import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { COURSE_MINUTES, COURSE_VIBES, type CourseMinutes, type CourseVibe } from '@/data/courses';
import { CATEGORIES } from '@/data/categories';
import { formatMinutes } from '@/data/durations';
import { useStoreVersion } from '@/hooks/useStoreVersion';
import { makeCourse } from '@/services/personalization';
import { getExperience } from '@/services/experiences';
import { isCourseSaved, newRunId, toggleSavedCourse } from '@/services/courses';
import type { Course } from '@/services/course';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { courseSearch, courseStepPath, parseCourseParams } from './courseParams';
import styles from './course.module.css';

const minutesLabel = (m: CourseMinutes) => (m === 60 ? '1시간' : `${m}분`);
const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥'];

/**
 * 작은 OFFROU 코스: 시간 → 분위기 → 코스 하나.
 * 만든 코스는 URL에 담겨 새로고침해도 같은 코스가 보인다.
 */
export function CoursePage() {
  const [params, setParams] = useSearchParams();
  const { course } = parseCourseParams(params);
  const show = (c: Course) => setParams(courseSearch(c), { replace: true });

  return course ? <CourseResult course={course} onShow={show} onReset={() => setParams({}, { replace: true })} /> : <CourseBuilder onMade={show} />;
}

function CourseBuilder({ onMade }: { onMade: (c: Course) => void }) {
  const [minutes, setMinutes] = useState<CourseMinutes | null>(null);
  const [vibe, setVibe] = useState<CourseVibe | null>(null);
  const [failed, setFailed] = useState(false);

  const make = () => {
    if (!minutes || !vibe) return;
    const course = makeCourse(minutes, vibe);
    setFailed(!course);
    if (course) onMade(course);
  };

  return (
    <div className={styles.page}>
      <header>
        <p className={styles.eyebrow}>작은 OFFROU 코스</p>
        <h1 className={styles.title}>조금 더 길게, 다른 시간을 이어볼까?</h1>
        <p className={styles.lead}>작은 시간 몇 개를 이어서 하나의 시간으로 만들어줄게.</p>
      </header>

      <section aria-labelledby="course-time" className={styles.section}>
        <h2 id="course-time" className={styles.question}>
          얼마나 시간이 있어?
        </h2>
        <div className={styles.chips} role="group" aria-labelledby="course-time">
          {COURSE_MINUTES.map((m) => (
            <Chip key={m} label={minutesLabel(m)} selected={minutes === m} onSelect={() => setMinutes(m)} />
          ))}
        </div>
      </section>

      {minutes && (
        <section aria-labelledby="course-vibe" className={`${styles.section} rise`}>
          <h2 id="course-vibe" className={styles.question}>
            어떤 분위기로 보낼까?
          </h2>
          <div className={styles.vibes} role="group" aria-labelledby="course-vibe">
            {COURSE_VIBES.map((v) => (
              <ChoiceCard
                key={v.id}
                label={`${v.label} · ${v.description}`}
                symbol={v.symbol}
                selected={vibe === v.id}
                onSelect={() => setVibe(v.id)}
              />
            ))}
          </div>
        </section>
      )}

      {failed && (
        <p className={styles.note} role="status">
          이 조건으로는 코스를 만들기 어려워. 다른 분위기나 시간을 골라볼래?
        </p>
      )}

      <Button block disabled={!minutes || !vibe} onClick={make}>
        코스 만들기
      </Button>
    </div>
  );
}

function CourseResult({ course, onShow, onReset }: { course: Course; onShow: (c: Course) => void; onReset: () => void }) {
  useStoreVersion();
  const navigate = useNavigate();
  const saved = isCourseSaved(course.id);
  const steps = course.stepIds.map((id) => getExperience(id)!);

  const another = () => {
    // 지금 코스와 가능한 한 다르게
    for (let i = 0; i < 5; i++) {
      const next = makeCourse(course.targetMinutes, course.vibe, course.stepIds);
      if (next && next.id !== course.id) return onShow(next);
    }
  };

  return (
    <div className={styles.page}>
      <header>
        <p className={styles.eyebrow}>오늘의 작은 코스</p>
        <h1 className={`${styles.title} rise`} key={course.id}>
          {course.title}
        </h1>
      </header>

      <ol className={styles.steps} aria-label="코스 순서">
        {steps.map((e, i) => {
          const category = CATEGORIES.find((c) => c.id === e.categoryId);
          return (
            <li key={e.id} className={styles.step}>
              <span className={styles.stepNum} aria-hidden="true">
                {CIRCLED[i]}
              </span>
              <span className={styles.stepText}>
                <span className={styles.stepTitle}>{e.title}</span>
                <span className={styles.stepMeta}>
                  {category?.code} · {formatMinutes(e.minutes)}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <p className={styles.total}>총 {formatMinutes(course.totalMinutes)}</p>

      <div className={styles.actions}>
        <Button block onClick={() => navigate(courseStepPath(course, 0, newRunId()))}>
          이 시간 시작하기
        </Button>
        <Button block variant="ghost" onClick={another}>
          <span aria-hidden="true">🎲 </span>다른 코스
        </Button>
        <button
          type="button"
          className={`${styles.save} ${saved ? styles.saveOn : ''}`}
          aria-pressed={saved}
          onClick={() => toggleSavedCourse(course)}
        >
          <span aria-hidden="true">{saved ? '♥' : '♡'}</span> {saved ? '저장한 코스' : '코스 저장'}
        </button>
        <button type="button" className={styles.quiet} onClick={onReset}>
          처음부터 다시 고르기
        </button>
      </div>
    </div>
  );
}
