import { Link, useNavigate } from 'react-router-dom';
import { APP_BASE } from '@/app/paths';
import { findVibe } from '@/data/courses';
import { formatMinutes } from '@/data/durations';
import { getExperience } from '@/services/experiences';
import { buildCourse } from '@/services/course';
import { toggleSavedCourse, type SavedCourse } from '@/services/courses';
import { coursePath } from '@/features/course/courseParams';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import styles from './MyPage.module.css';

/** 저장한 코스. 누르면 코스 화면에서 바로 다시 시작할 수 있다 (편집 기능은 없다). */
export function SavedCourseList({ courses }: { courses: SavedCourse[] }) {
  const navigate = useNavigate();
  // 콘텐츠가 바뀌어 다시 만들 수 없는 코스는 조용히 건너뛴다
  const items = courses
    .map((s) => ({ saved: s, course: buildCourse(s.vibe, s.targetMinutes, s.stepIds) }))
    .filter((x) => x.course !== undefined);

  if (items.length === 0) {
    return (
      <EmptyState symbol="🧭" title="아직 저장한 코스가 없어." description="작은 OFFROU 코스를 만들고 ♡를 눌러봐.">
        <Button variant="ghost" onClick={() => navigate(`${APP_BASE}/course`)}>
          코스 만들기
        </Button>
      </EmptyState>
    );
  }

  return (
    <ul className={styles.list}>
      {items.map(({ saved, course }) => (
        <li key={saved.id} className={styles.savedRow}>
          <Link to={coursePath(course!)} className={styles.card}>
            <span className={styles.symbol} aria-hidden="true">
              {findVibe(saved.vibe)?.symbol ?? '🧭'}
            </span>
            <span className={styles.text}>
              <span className={styles.title}>{saved.title}</span>
              <span className={styles.meta}>
                {course!.stepIds.map((id) => getExperience(id)?.title).join(' → ')}
              </span>
              <span className={styles.meta}>총 {formatMinutes(course!.totalMinutes)}</span>
            </span>
          </Link>
          <span className={styles.savedToggle}>
            <button
              type="button"
              className={styles.unsave}
              aria-label={`${saved.title} 저장 취소`}
              onClick={() => toggleSavedCourse(course!)}
            >
              <span aria-hidden="true">♥</span>
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
