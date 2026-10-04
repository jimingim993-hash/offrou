import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CATEGORIES } from '@/data/categories';
import { getExperience } from '@/services/experiences';
import { addRecord } from '@/services/records';
import { noteStarted } from '@/services/activity';
import { noteRecent } from '@/services/recent';
import { ReportProblem } from '@/features/support/ReportProblem';
import { clearCourseResume, saveCourseResume } from '@/services/resume';
import { parseReadyParams } from '@/features/ready/readyParams';
import { endCourseRun, recordCourseStep } from '@/services/courses';
import { courseDonePath, courseNextPath, parseCourseParams } from '@/features/course/courseParams';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { getRunner, type RunResult } from './runners';
import type { DoneState } from './ExperienceDonePage';
import { ExitSheet } from './ExitSheet';
import { donePath, experiencePath } from './paths';
import styles from './ExperiencePlayPage.module.css';

/**
 * 경험 진행 화면(공통 틀).
 * 경험의 실행 방식에 맞는 실행기를 그리고, 나가기·기록·완료 이동만 여기서 처리한다.
 * 타이머를 강제하지 않으며 언제든 나가거나 마칠 수 있다.
 * 작은 코스 안이면(쿼리 cmin·cvibe·csteps·cstep·crun) 진행 표시를 보여주고, 마치면 다음 시간으로 이어준다.
 */
export function ExperiencePlayPage() {
  const { experienceId } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const finished = useRef(false);
  const [exitOpen, setExitOpen] = useState(false);
  const experience = getExperience(experienceId);

  // 시작했다는 사실만 남긴다 (이야기 속 선택 내용은 저장하지 않음)
  const started = useRef(false);
  useEffect(() => {
    if (!experience || started.current) return;
    started.current = true;
    noteStarted(experience.id);
    noteRecent(experience.id);
  }, [experience]);

  const { course, step, runId } = parseCourseParams(params);
  const inCourse =
    experience && course && step !== undefined && runId && course.stepIds[step] === experience.id ? { course, step, runId } : null;

  // 작은 코스 진행 중이면 지금 시간을 이어하기 지점으로 남긴다 (16단계)
  const courseKey = inCourse ? `${inCourse.runId}:${inCourse.step}` : '';
  useEffect(() => {
    if (!inCourse) return;
    const { course: c, step: s, runId: r } = inCourse;
    saveCourseResume({ vibe: c.vibe, minutes: c.targetMinutes, stepIds: c.stepIds, step: s, runId: r });
  }, [courseKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!experience) return <Navigate to="/app" replace />;

  const category = CATEGORIES.find((c) => c.id === experience.categoryId);
  const Runner = getRunner(experience);


  const finish = (result: RunResult = {}) => {
    if (finished.current) return;
    finished.current = true;
    const { mood, duration } = parseReadyParams(params);
    const record = addRecord(experience, {
      moodId: mood?.id,
      durationId: duration?.id,
      endingTitle: result.endingTitle,
      courseRunId: inCourse?.runId,
    });
    if (inCourse) {
      const { course, step, runId } = inCourse;
      recordCourseStep(runId, course, experience.id);
      if (step + 1 < course.stepIds.length) {
        saveCourseResume({ vibe: course.vibe, minutes: course.targetMinutes, stepIds: course.stepIds, step: step + 1, runId });
        navigate(courseNextPath(course, step + 1, runId), { replace: true });
      } else {
        clearCourseResume(runId);
        endCourseRun(runId, course);
        navigate(courseDonePath(course, runId), { replace: true });
      }
      return;
    }
    navigate(donePath(experience.id), { replace: true, state: { ...result, recordId: record.id } satisfies DoneState });
  };

  // 코스를 여기까지만 (지금 시간은 기록하지 않고, 이미 마친 시간은 그대로 남는다)
  const endCourse = () => {
    if (!inCourse) return;
    clearCourseResume(inCourse.runId);
    endCourseRun(inCourse.runId, inCourse.course);
    navigate(courseDonePath(inCourse.course, inCourse.runId), { replace: true });
  };

  // 기록 없이 나가기. 앱 안에서 들어왔으면 이전 화면으로, 아니면 경험 상세로.
  const leave = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate(experiencePath(experience.id), { replace: true });
  };

  return (
    <div className={styles.play}>
      <div className={styles.bar}>
        <button type="button" className={styles.exit} onClick={() => setExitOpen(true)}>
          <span aria-hidden="true">←</span> 나가기
        </button>
        <span className={styles.code}>
          <span aria-hidden="true">{experience.symbol ?? category?.symbol}</span> {category?.code}
        </span>
      </div>

      {inCourse && (
        <div className={styles.course}>
          <span className={styles.courseTitle}>{inCourse.course.title}</span>
          <ProgressDots total={inCourse.course.stepIds.length} current={inCourse.step + 1} />
        </div>
      )}

      <h1 className={styles.title}>{experience.title}</h1>

      <Runner experience={experience} onFinish={finish} />

      <div className={styles.report}>
        <ReportProblem experience={experience} />
      </div>

      {exitOpen &&
        (inCourse ? (
          <ExitSheet courseMode onEndCourse={endCourse} onStay={() => setExitOpen(false)} />
        ) : (
          <ExitSheet onFinishHere={() => finish()} onLeave={leave} onStay={() => setExitOpen(false)} />
        ))}
    </div>
  );
}
