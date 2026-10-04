import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Orb } from '@/components/ui/Orb';
import { ExperienceIntro } from '@/components/experience/ExperienceIntro';
import { candidatesFor } from '@/services/recommendation';
import { getNextRecommendation, getReason } from '@/services/personalization';
import { noteSkipped } from '@/services/activity';
import { getRecords } from '@/services/records';
import { playPath } from '@/features/experience/paths';
import { parseReadyParams, readySearch } from './readyParams';
import styles from './ReadyPage.module.css';

/** "평소와 조금 다른 걸 해볼래?"를 보여줄 만큼 쌓인 기록 수 */
const FRESH_OFFER_MIN_RECORDS = 2;

/**
 * 오늘의 OFFROU 추천 결과. 한 번에 하나만 보여준다.
 * 추천 로직은 services/personalization → services/recommendation이 맡고, 여기서는 보여주기만 한다.
 * 현재 추천은 ?pick=으로 URL에 남겨 새로고침해도 같은 경험이 유지된다.
 */
export function ReadyPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { mood, duration, pickId, mode } = parseReadyParams(params);

  const candidates = useMemo(
    () => (mood && duration ? candidatesFor(mood.id, duration, mode) : []),
    [mood, duration, mode],
  );
  const current = candidates.find((e) => e.id === pickId);

  const showNext = useCallback(
    (excludeId?: string, nextMode = mode) => {
      if (!mood || !duration) return;
      const next = getNextRecommendation({ mood: mood.id, duration, mode: nextMode, excludeId });
      if (next) setParams(readySearch(mood.id, duration.id, next.experience.id, nextMode), { replace: true });
    },
    [mood, duration, mode, setParams],
  );

  // 처음 들어왔거나 pick이 유효하지 않으면 하나를 골라 URL에 고정
  useEffect(() => {
    if (!current && candidates.length > 0) showNext();
  }, [current, candidates.length, showNext]);

  if (!mood || !duration) {
    return (
      <EmptyState symbol="🧭" title="어떤 시간이 필요한지 먼저 골라줘." description="HOME에서 다시 시작할 수 있어.">
        <Button onClick={() => navigate('/app')}>HOME으로</Button>
      </EmptyState>
    );
  }

  if (candidates.length === 0) {
    return (
      <EmptyState symbol="🌙" title="이 시간에 꼭 맞는 OFFROU가 아직 없어." description="시간을 조금 넉넉하게 잡아볼까?">
        <Button onClick={() => setParams(readySearch(mood.id, 'any'), { replace: true })}>시간 상관없이 보기</Button>
      </EmptyState>
    );
  }

  const offerFresh = mode === 'usual' && mood.id !== 'bedtime' && getRecords().length >= FRESH_OFFER_MIN_RECORDS;

  return (
    <div className={styles.ready}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>오늘의 OFFROU</p>
        <p className={styles.summary}>
          <span>{mood.label}</span>
          <span aria-hidden="true">·</span>
          <span>{duration.label}</span>
        </p>
      </header>

      {current ? (
        <>
          <ExperienceIntro key={current.id} experience={current} note={getReason(current, duration, mode)}>
            <Button block onClick={() => navigate(playPath(current.id, `?${params.toString()}`))}>
              이 시간 시작하기
            </Button>
            {candidates.length > 1 && (
              <Button
                block
                variant="ghost"
                onClick={() => {
                  noteSkipped(current.id);
                  showNext(current.id);
                }}
              >
                <span aria-hidden="true">🎲 </span>다른 시간 보기
              </Button>
            )}
          </ExperienceIntro>

          {offerFresh && (
            <button type="button" className={styles.fresh} onClick={() => showNext(current.id, 'fresh')}>
              <span aria-hidden="true">🌱</span> 평소와 조금 다른 걸 해볼래?
            </button>
          )}
        </>
      ) : (
        <div className={styles.preparing}>
          <Orb />
          <p>너에게 맞는 새로운 시간을 준비하고 있어.</p>
        </div>
      )}
    </div>
  );
}
