import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CATEGORIES } from '@/data/categories';
import { getExperience } from '@/services/experiences';
import { addRecord } from '@/services/records';
import { noteStarted } from '@/services/activity';
import { parseReadyParams } from '@/features/ready/readyParams';
import { getRunner, type RunResult } from './runners';
import type { DoneState } from './ExperienceDonePage';
import { ExitSheet } from './ExitSheet';
import { donePath, experiencePath } from './paths';
import styles from './ExperiencePlayPage.module.css';

/**
 * 경험 진행 화면(공통 틀).
 * 경험의 실행 방식에 맞는 실행기를 그리고, 나가기·기록·완료 이동만 여기서 처리한다.
 * 타이머를 강제하지 않으며 언제든 나가거나 마칠 수 있다.
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
  }, [experience]);

  if (!experience) return <Navigate to="/" replace />;

  const category = CATEGORIES.find((c) => c.id === experience.categoryId);
  const Runner = getRunner(experience);

  const finish = (result: RunResult = {}) => {
    if (finished.current) return;
    finished.current = true;
    const { mood, duration } = parseReadyParams(params);
    const record = addRecord(experience, { moodId: mood?.id, durationId: duration?.id, endingTitle: result.endingTitle });
    navigate(donePath(experience.id), { replace: true, state: { ...result, recordId: record.id } satisfies DoneState });
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

      <h1 className={styles.title}>{experience.title}</h1>

      <Runner experience={experience} onFinish={finish} />

      {exitOpen && <ExitSheet onFinishHere={() => finish()} onLeave={leave} onStay={() => setExitOpen(false)} />}
    </div>
  );
}
