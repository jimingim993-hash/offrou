import { findVibe, isCourseMinutes } from '@/data/courses';
import { buildCourse, type Course } from '@/services/course';
import { APP_BASE } from '@/app/paths';
import { playPath } from '@/features/experience/paths';

/**
 * 코스는 URL에 담는다 → 새로고침·뒤로 가기·저장한 코스 다시 열기에 그대로 쓰인다.
 * 상태+시간 추천의 쿼리(mood·time)와 섞이지 않도록 c 접두사를 쓴다.
 *   cmin=30 & cvibe=new & csteps=a,b,c  (+ 진행 중이면 cstep=0 & crun=run-…)
 */
export function courseSearch(course: Course, extra: { step?: number; run?: string } = {}) {
  const p = new URLSearchParams({
    cmin: String(course.targetMinutes),
    cvibe: course.vibe,
    csteps: course.stepIds.join(','),
  });
  if (extra.step !== undefined) p.set('cstep', String(extra.step));
  if (extra.run) p.set('crun', extra.run);
  return p;
}

export function parseCourseParams(params: URLSearchParams): { course?: Course; step?: number; runId?: string } {
  const minutes = Number(params.get('cmin'));
  const vibe = findVibe(params.get('cvibe'))?.id;
  const steps = (params.get('csteps') ?? '').split(',').filter(Boolean);
  const course = vibe && isCourseMinutes(minutes) && steps.length ? buildCourse(vibe, minutes, steps) : undefined;
  const stepRaw = params.get('cstep');
  const step = stepRaw !== null && /^\d+$/.test(stepRaw) ? Number(stepRaw) : undefined;
  return { course, step: course && step !== undefined && step < course.stepIds.length ? step : undefined, runId: params.get('crun') ?? undefined };
}

export const coursePath = (course: Course) => `${APP_BASE}/course?${courseSearch(course)}`;

export const courseStepPath = (course: Course, step: number, run: string) =>
  playPath(course.stepIds[step], `?${courseSearch(course, { step, run })}`);

export const courseNextPath = (course: Course, step: number, run: string) =>
  `${APP_BASE}/course/next?${courseSearch(course, { step, run })}`;

export const courseDonePath = (course: Course, run: string) => `${APP_BASE}/course/done?${courseSearch(course, { run })}`;
