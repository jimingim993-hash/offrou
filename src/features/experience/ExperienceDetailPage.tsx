import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { getExperience } from '@/services/experiences';
import { hasRecord } from '@/services/records';
import { noteViewed } from '@/services/activity';
import { noteRecent } from '@/services/recent';
import { ReportProblem } from '@/features/support/ReportProblem';
import { ExperienceIntro } from '@/components/experience/ExperienceIntro';
import { Button } from '@/components/ui/Button';
import { playPath } from './paths';
import styles from './ExperienceDetailPage.module.css';

/** 발견에서 고른 경험의 상세 */
export function ExperienceDetailPage() {
  const { experienceId } = useParams();
  const navigate = useNavigate();
  const experience = getExperience(experienceId);

  // 최근 본 시간 (최대 5개, 이 기기에만)
  useEffect(() => {
    if (experience) {
      noteViewed(experience.id);
      noteRecent(experience.id);
    }
  }, [experience]);

  if (!experience) return <Navigate to="/app/discover" replace />;

  const visited = hasRecord(experience.id);
  const isStory = experience.interaction?.type === 'story';

  return (
    <div className={styles.detail}>
      <ExperienceIntro experience={experience} titleHeading>
        <Button block onClick={() => navigate(playPath(experience.id))}>
          {visited ? '다시 경험하기' : '이 시간 시작하기'}
        </Button>
        <Button block variant="ghost" onClick={() => navigate(`/app/discover/${experience.categoryId}`)}>
          다른 시간 둘러보기
        </Button>
      </ExperienceIntro>
      {visited && isStory && <p className={styles.hint}>다른 선택을 하면, 다른 하루가 될 수도 있어.</p>}
      <div className={styles.report}>
        <ReportProblem experience={experience} />
      </div>
    </div>
  );
}
