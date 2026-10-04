import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getExperience } from '@/services/experiences';
import { getNextPlay } from '@/services/personalization';
import { Button } from '@/components/ui/Button';
import { Orb } from '@/components/ui/Orb';
import type { RunResult } from './runners';
import { FeedbackPrompt } from './FeedbackPrompt';
import { playPath } from './paths';
import styles from './ExperienceDonePage.module.css';

/** 진행 화면에서 넘겨주는 완료 정보 (history state라 새로고침해도 유지된다) */
export interface DoneState extends RunResult {
  recordId?: string;
}

/** 완료 화면. 점수·연속 기록 같은 건 두지 않는다. 실행형 PLAY는 "또 놀아볼래?"를 함께 건넨다. */
export function ExperienceDonePage() {
  const { experienceId } = useParams();
  const navigate = useNavigate();
  const result = (useLocation().state ?? {}) as DoneState;
  const experience = getExperience(experienceId);

  if (!experience) return <Navigate to="/app" replace />;
  const isPlay = experience.interaction?.type === 'play';
  const isStory = experience.interaction?.type === 'story';

  return (
    <div className={styles.done}>
      <Orb />
      <h1 className={styles.title}>{isPlay ? '잠깐 다른 시간을 보냈어.' : '오늘의 OFFROU가 하나 남았어.'}</h1>
      {result.endingTitle && <p className={styles.ending}>“{result.endingTitle}”</p>}
      <p className={styles.message}>{result.message ?? experience.doneMessage}</p>
      <div className={styles.actions}>
        {isPlay && (
          <Button
            block
            onClick={() => {
              const next = getNextPlay(experience.id);
              if (next) navigate(playPath(next.id));
            }}
          >
            또 놀아볼래?
          </Button>
        )}
        <Button block variant={isPlay ? 'ghost' : 'primary'} onClick={() => navigate('/app')}>
          HOME으로 돌아가기
        </Button>
        <Button block variant="ghost" onClick={() => navigate('/app/my')}>
          MY OFFROU 보기
        </Button>
        {isStory && (
          // 강요하지 않는 작은 선택지. 결말 수집·몇 개 발견 같은 표시는 두지 않는다
          <Button block variant="ghost" onClick={() => navigate(playPath(experience.id))}>
            다른 선택으로 다시 해볼래
          </Button>
        )}
      </div>
      {result.recordId && <FeedbackPrompt recordId={result.recordId} experience={experience} />}
    </div>
  );
}
