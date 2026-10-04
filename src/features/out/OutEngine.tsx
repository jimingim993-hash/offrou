import { useState } from 'react';
import {
  DIRECTIONS,
  NIGHT_NOTE,
  OUT_COLORS,
  OUT_LETTERS,
  OUT_SAFETY,
  OUT_SEASON_HINTS,
  WEATHER_NOTE,
  isNight,
  type OutProgram,
} from '@/data/out/programs';
import { COST_LABELS } from '@/data/places';
import { formatMinutes } from '@/data/durations';
import type { Experience } from '@/types/offrou';
import type { RunResult } from '@/features/experience/runners/types';
import { useCountdown } from '@/hooks/useCountdown';
import { pickOne } from '@/services/random';
import styles from './out.module.css';

type Phase = 'ready' | 'steps' | 'indoor';

/**
 * OUT 엔진 — 모든 실행형 OUT을 데이터(src/data/out/programs.ts)만으로 그린다.
 * 활동 확인 → [밖으로 나가볼래] → 단계 하나씩 (화면은 내려놓고 다녀와) → [했어] → 완료.
 * GPS·지도·위치 권한·카메라·걸음 수를 쓰지 않고, 수행 여부를 검증하지 않는다. [했어]면 충분하다.
 */
export function OutEngine({
  experience,
  program,
  onFinish,
  now = new Date(),
}: {
  experience: Experience;
  program: OutProgram;
  onFinish: (result?: RunResult) => void;
  now?: Date;
}) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<string | null>(null);
  const [random] = useState(() =>
    program.random === 'color'
      ? `오늘의 색: ${pickOne(OUT_COLORS)}`
      : program.random === 'letter'
        ? `오늘의 글자: ${pickOne(OUT_LETTERS)}`
        : program.random === 'season'
          ? `오늘의 힌트: ${pickOne(OUT_SEASON_HINTS)}`
          : null,
  );
  const timer = useCountdown();
  const night = isNight(now);
  // 완료 문구는 경험 데이터(doneMessage)를 기준으로 — 기존 경험과 같은 문구를 유지한다
  const finish = (message = experience.doneMessage || program.completionMessage) => onFinish({ message });
  const supplies = experience.supplies.length ? experience.supplies.join(' · ') : '없음';

  const endHere = (
    <button type="button" className={styles.endHere} onClick={() => finish()}>
      이 시간 마치기
    </button>
  );

  /* ─── 활동 확인 ─── */
  if (phase === 'ready')
    return (
      <div className={styles.out}>
        <p className={styles.lead}>{experience.summary}</p>
        {random && <p className={styles.random}>{random}</p>}
        <ul className={styles.meta} aria-label="활동 정보">
          <li>
            <span className={styles.metaKey}>예상 시간</span> {formatMinutes(experience.minutes)}
          </li>
          <li>
            <span className={styles.metaKey}>장소</span> {program.placeType}
          </li>
          <li>
            <span className={styles.metaKey}>비용</span> {COST_LABELS[experience.cost ?? 'free']}
          </li>
          <li>
            <span className={styles.metaKey}>준비물</span> {supplies}
          </li>
        </ul>
        {program.onlyIf && <p className={styles.note}>{`${program.onlyIf}만 해봐. 없다면 실내 대체 활동으로.`}</p>}

        <section className={styles.safety} aria-labelledby="out-safety">
          <h2 id="out-safety" className={styles.safetyTitle}>
            안전하게
          </h2>
          <ul>
            {[...OUT_SAFETY, ...(program.safety ?? [])].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        {night && (
          <p className={styles.night} role="note">
            {NIGHT_NOTE}
          </p>
        )}
        <p className={styles.note}>{WEATHER_NOTE}</p>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => setPhase('steps')}>
            밖으로 나가볼래
          </button>
          <button type="button" className={styles.secondary} onClick={() => setPhase('indoor')}>
            {`실내에서 대신 할래 · ${program.indoorFallback.title}`}
          </button>
        </div>
        {endHere}
      </div>
    );

  /* ─── 실내 대체 활동 ─── */
  if (phase === 'indoor')
    return (
      <div className={styles.out}>
        <p className={styles.eyebrow}>실내 대체 활동</p>
        <p className={styles.big}>{program.indoorFallback.title}</p>
        <ol className={styles.list}>
          {program.indoorFallback.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => finish('밖에 나가지 않아도, 평소와 다른 시간을 보냈어.')}>
            했어
          </button>
          <button type="button" className={styles.secondary} onClick={() => setPhase('ready')}>
            밖으로 나가볼래
          </button>
        </div>
        {endHere}
      </div>
    );

  /* ─── 단계 ─── */
  const last = step === program.steps.length - 1;
  const directionStep = program.directions && step === 1;
  return (
    <div className={styles.out}>
      <p className={styles.eyebrow}>{`${step + 1} / ${program.steps.length}`}</p>
      {random && <p className={styles.random}>{random}</p>}
      <p className={styles.big} aria-live="polite">
        {program.steps[step]}
      </p>

      {directionStep && (
        <div className={styles.directions}>
          {direction ? (
            <>
              <p className={styles.random}>{`이번엔 ${direction}`}</p>
              <button type="button" className={styles.secondary} onClick={() => setDirection(pickOne(DIRECTIONS, Math.random, direction))}>
                이 방향은 안전하지 않아 · 다른 선택
              </button>
            </>
          ) : (
            <>
              <p className={styles.note}>지금 안전한 곳에 서 있다면 눌러줘.</p>
              <button type="button" className={styles.secondary} onClick={() => setDirection(pickOne(DIRECTIONS))}>
                안전한 곳에 서 있어 · 방향 보기
              </button>
            </>
          )}
        </div>
      )}

      {program.timerMinutes && step === 0 && (
        <div className={styles.timerRow}>
          {timer.running ? (
            <p className={styles.timer} role="timer" aria-label={`남은 시간 ${timer.label}`}>
              {timer.done ? '시간이 됐어. 천천히 돌아와.' : timer.label}
            </p>
          ) : (
            <button type="button" className={styles.secondary} onClick={() => timer.start(program.timerMinutes! * 60)}>
              {`타이머 켜기 · ${program.timerMinutes}분 (선택)`}
            </button>
          )}
        </div>
      )}

      <p className={styles.putDown}>이제 화면을 내려놓고 다녀와. 하고 나서 [했어]를 눌러.</p>
      <div className={styles.actions}>
        {last ? (
          <button type="button" className={styles.primary} onClick={() => finish()}>
            돌아왔어
          </button>
        ) : (
          <button
            type="button"
            className={styles.primary}
            disabled={directionStep && !direction}
            onClick={() => setStep((s) => s + 1)}
          >
            했어
          </button>
        )}
      </div>
      {endHere}
    </div>
  );
}
