import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getExperience } from '@/services/experiences';
import { Button } from '@/components/ui/Button';
import { Orb } from '@/components/ui/Orb';
import type { RunResult } from './runners';
import { FeedbackPrompt } from './FeedbackPrompt';
import styles from './ExperienceDonePage.module.css';

/** 진행 화면에서 넘겨주는 완료 정보 (history state라 새로고침해도 유지된다) */
export interface DoneState extends RunResult {
  recordId?: string;
}

/** 완료 화면. 점수·연속 기록 같은 건 두지 않는다. */
export function ExperienceDonePage() {
  const { experienceId } = useParams();
  const navigate = useNavigate();
  const result = (useLocation().state ?? {}) as DoneState;
  const experience = getExperience(experienceId);

  if (!experience) return <Navigate to="/" replace />;

  return (
    <div className={styles.done}>
      <Orb />
      <h1 className={styles.title}>오늘의 OFFROU가 하나 남았어.</h1>
      {result.endingTitle && <p className={styles.ending}>“{result.endingTitle}”</p>}
      <p className={styles.message}>{result.message ?? experience.doneMessage}</p>
      <div className={styles.actions}>
        <Button block onClick={() => navigate('/')}>
          HOME으로 돌아가기
        </Button>
        <Button block variant="ghost" onClick={() => navigate('/my')}>
          MY OFFROU 보기
        </Button>
      </div>
      {result.recordId && <FeedbackPrompt recordId={result.recordId} experience={experience} />}
    </div>
  );
}
