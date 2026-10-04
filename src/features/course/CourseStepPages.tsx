import { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { APP_BASE } from '@/app/paths';
import { formatMinutes } from '@/data/durations';
import { getExperience } from '@/services/experiences';
import { endCourseRun, getCourseRun } from '@/services/courses';
import { Button } from '@/components/ui/Button';
import { Orb } from '@/components/ui/Orb';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { courseDonePath, courseStepPath, parseCourseParams } from './courseParams';
import styles from './course.module.css';

/** 코스 중간: 한 시간을 마치고 다음으로 넘어가기 전 잠깐 숨 고르기 */
export function CourseNextPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { course, step, runId } = parseCourseParams(params);
  if (!course || step === undefined || !runId) return <Navigate to={`${APP_BASE}/course`} replace />;

  const next = getExperience(course.stepIds[step])!;

  return (
    <div className={`${styles.page} ${styles.center}`}>
      <ProgressDots total={course.stepIds.length} current={step} />
      <Orb />
      <h1 className={styles.title}>한 시간을 보냈어.</h1>
      <p className={styles.lead}>
        다음은 <strong>{next.title}</strong> · {formatMinutes(next.minutes)}
      </p>
      <div className={styles.actions}>
        <Button block onClick={() => navigate(courseStepPath(course, step, runId), { replace: true })}>
          다음 시간으로
        </Button>
        <Button
          block
          variant="ghost"
          onClick={() => {
            endCourseRun(runId, course);
            navigate(courseDonePath(course, runId), { replace: true });
          }}
        >
          여기까지만 할래
        </Button>
      </div>
    </div>
  );
}

/** 코스 마무리. 끝까지 했든 중간에 멈췄든 조용히 마무리한다 (점수·완료율 없음). */
export function CourseDonePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { course, runId } = parseCourseParams(params);

  useEffect(() => {
    if (course && runId) endCourseRun(runId, course);
  }, [course, runId]);

  if (!course || !runId) return <Navigate to={`${APP_BASE}/course`} replace />;

  const run = getCourseRun(runId);
  const done = (run?.completedIds ?? []).map((id) => getExperience(id)).filter((e) => e !== undefined);
  const all = done.length === course.stepIds.length;

  return (
    <div className={`${styles.page} ${styles.center}`}>
      <Orb />
      <h1 className={styles.title}>{all ? '오늘은 평소와 조금 다른 시간을 보냈어.' : '여기까지 보낸 시간도 충분해.'}</h1>
      {done.length > 0 ? (
        <>
          <p className={styles.lead}>
            {course.title} · {done.length}개의 시간을 보냈어.
          </p>
          <ul className={styles.doneList}>
            {done.map((e) => (
              <li key={e.id}>{e.title}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className={styles.lead}>괜찮아. 다음에 또 열어봐.</p>
      )}
      <div className={styles.actions}>
        <Button block onClick={() => navigate(APP_BASE)}>
          HOME으로 돌아가기
        </Button>
        <Button block variant="ghost" onClick={() => navigate(`${APP_BASE}/my`)}>
          MY OFFROU 보기
        </Button>
      </div>
    </div>
  );
}

