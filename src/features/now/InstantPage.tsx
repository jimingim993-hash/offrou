import { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Orb } from '@/components/ui/Orb';
import { ExperienceIntro } from '@/components/experience/ExperienceIntro';
import { getExperience } from '@/services/experiences';
import { getInstantReason, getNextInstant } from '@/services/personalization';
import { noteSkipped } from '@/services/activity';
import { playPath } from '@/features/experience/paths';
import styles from '@/features/ready/ReadyPage.module.css';

/**
 * 지금 딱 하나: 질문 없이 바로 하나. 고를 것도, 목록도 없다.
 * 현재 추천은 ?pick=으로 남겨 새로고침해도 그대로 보인다.
 */
export function InstantPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const current = getExperience(params.get('pick') ?? undefined);

  const showNext = useCallback(
    (excludeId?: string) => {
      const next = getNextInstant(excludeId);
      if (next) setParams({ pick: next.experience.id }, { replace: true });
    },
    [setParams],
  );

  useEffect(() => {
    if (!current) showNext();
  }, [current, showNext]);

  return (
    <div className={styles.ready}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>지금 딱 하나</p>
        <p className={styles.summary}>지금 이건 어때?</p>
      </header>

      {current ? (
        <ExperienceIntro key={current.id} experience={current} note={getInstantReason(current)}>
          <Button block onClick={() => navigate(playPath(current.id))}>
            이 시간 시작하기
          </Button>
          <Button
            block
            variant="ghost"
            onClick={() => {
              noteSkipped(current.id);
              showNext(current.id);
            }}
          >
            <span aria-hidden="true">🎲 </span>다른 거
          </Button>
        </ExperienceIntro>
      ) : (
        <div className={styles.preparing}>
          <Orb />
          <p>지금 할 만한 시간을 고르고 있어.</p>
        </div>
      )}
    </div>
  );
}
