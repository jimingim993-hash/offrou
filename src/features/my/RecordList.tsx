import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { findVibe } from '@/data/courses';
import { buildCourse } from '@/services/course';
import type { CourseRun } from '@/services/courses';
import { coursePath } from '@/features/course/courseParams';
import { CATEGORIES } from '@/data/categories';
import { formatMinutes } from '@/data/durations';
import { getExperience } from '@/services/experiences';
import { experiencePath } from '@/features/experience/paths';
import type { OffrouRecord } from '@/types/offrou';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import styles from './MyPage.module.css';

const dayLabel = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;

/** 지나온 시간 한 줄: 개별 경험 또는 코스 하나 (코스 안의 경험들은 코스 카드 하나로 묶는다) */
type Entry =
  | { kind: 'record'; at: string; record: OffrouRecord }
  | { kind: 'course'; at: string; run: CourseRun; records: OffrouRecord[] };

export function buildEntries(records: OffrouRecord[], runs: CourseRun[]): Entry[] {
  const runMap = new Map(runs.filter((r) => r.completedIds.length > 0).map((r) => [r.id, r]));
  const byRun = new Map<string, OffrouRecord[]>();
  const entries: Entry[] = [];
  for (const r of records) {
    if (r.courseRunId && runMap.has(r.courseRunId)) byRun.set(r.courseRunId, [...(byRun.get(r.courseRunId) ?? []), r]);
    else entries.push({ kind: 'record', at: r.completedAt, record: r });
  }
  for (const run of runMap.values()) {
    const items = byRun.get(run.id) ?? [];
    const at = items.reduce((max, r) => (r.completedAt > max ? r.completedAt : max), items[0]?.completedAt ?? run.updatedAt);
    entries.push({ kind: 'course', at, run, records: items });
  }
  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

/** 최신순 항목을 날짜별로 묶는다 */
function groupByDay(entries: Entry[]) {
  const groups: { key: string; label: string; items: Entry[] }[] = [];
  for (const r of entries) {
    const date = new Date(r.at);
    const key = date.toDateString();
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(r);
    else groups.push({ key, label: dayLabel(date), items: [r] });
  }
  return groups;
}

/** 지나온 시간 */
export function RecordList({ records, runs = [] }: { records: OffrouRecord[]; runs?: CourseRun[] }) {
  const navigate = useNavigate();
  const entries = buildEntries(records, runs);

  if (entries.length === 0) {
    return (
      <EmptyState symbol="🍃" title="아직 남겨진 시간이 없어." description="첫 번째 OFFROU를 경험하면 여기에 하나씩 쌓일 거야.">
        <Button onClick={() => navigate('/app')}>첫 OFFROU 시작하기</Button>
      </EmptyState>
    );
  }

  return (
    <div className={styles.timeline}>
      {groupByDay(entries).map((g) => (
        <section key={g.key} className={styles.day} aria-label={g.label}>
          <h2 className={styles.date}>{g.label}</h2>
          <ul className={styles.list}>
            {g.items.map((entry) => {
              if (entry.kind === 'course') return <CourseEntry key={entry.run.id} run={entry.run} records={entry.records} />;
              const r = entry.record;
              const category = CATEGORIES.find((c) => c.id === r.categoryId);
              return (
                <li key={r.id}>
                  <Link to={experiencePath(r.experienceId)} className={styles.card}>
                    <span className={styles.symbol} aria-hidden="true">
                      {getExperience(r.experienceId)?.symbol ?? category?.symbol}
                    </span>
                    <span className={styles.text}>
                      <span className={styles.title}>{r.title}</span>
                      {r.endingTitle && <span className={styles.ending}>“{r.endingTitle}”</span>}
                      <span className={styles.meta}>
                        {category?.code} · {formatMinutes(r.minutes)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** 코스 기록: 제목 · 지나온 카테고리 · 보낸 시간 수. 누르면 같은 코스를 다시 열 수 있다. */
function CourseEntry({ run, records }: { run: CourseRun; records: OffrouRecord[] }) {
  const codes = [
    ...new Set(
      run.completedIds
        .map((id) => getExperience(id)?.categoryId ?? records.find((r) => r.experienceId === id)?.categoryId)
        .map((cid) => CATEGORIES.find((c) => c.id === cid)?.code)
        .filter(Boolean),
    ),
  ];
  const course = buildCourse(run.vibe, run.targetMinutes, run.stepIds);
  const body: ReactNode = (
    <>
      <span className={styles.symbol} aria-hidden="true">
        {findVibe(run.vibe)?.symbol ?? '🧭'}
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{run.title}</span>
        <span className={styles.ending}>{codes.join(' · ')}</span>
        <span className={styles.meta}>작은 코스 · {run.completedIds.length}개의 시간을 보냈어.</span>
      </span>
    </>
  );
  return (
    <li>
      {course ? (
        <Link to={coursePath(course)} className={styles.card}>
          {body}
        </Link>
      ) : (
        <div className={styles.card}>{body}</div>
      )}
    </li>
  );
}
