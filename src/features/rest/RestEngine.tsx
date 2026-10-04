import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { CALM_COLORS, type RestProgram } from '@/data/rest/programs';
import type { Experience } from '@/types/offrou';
import type { RunResult } from '@/features/experience/runners/types';
import { useCountdown } from '@/hooks/useCountdown';
import { pickOne } from '@/services/random';
import styles from './rest.module.css';

type Phase = 'ready' | 'resting';

/**
 * REST 엔진 — 모든 실행형 REST를 데이터(src/data/rest/programs.ts)만으로 그린다.
 * 짧은 안내 → 시작(타이머는 고를 때만) → 조용한 휴식 화면 → 원할 때 종료.
 * - 타이머는 PLAY·HOBBY와 같은 useCountdown(실제 시각 기준 → 탭을 벗어나도 크게 어긋나지 않음).
 * - 시간이 끝나도, 중간에 그만둬도 실패가 아니다. 사용자의 행동을 감시하지 않는다.
 * - 소리 자동 재생·호흡 훈련·효과 주장 없음.
 */
export function RestEngine({
  experience,
  program,
  onFinish,
}: {
  experience: Experience;
  program: RestProgram;
  onFinish: (result?: RunResult) => void;
}) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [color] = useState(() => pickOne(CALM_COLORS));
  const timer = useCountdown();
  const tone = experience.interaction?.type === 'rest' ? experience.interaction.tone : 'sky';
  // 완료 문구는 경험 데이터(doneMessage)를 기준으로 — 기존 경험과 같은 문구를 유지한다
  const finish = (message = experience.doneMessage || program.completionMessage) => onFinish({ message });

  const begin = (seconds?: number) => {
    setPhase('resting');
    setStep(0);
    setRevealed(false);
    if (seconds) timer.start(seconds);
  };

  const backdrop = createPortal(
    <div className={`${styles.backdrop} ${styles[`tone-${tone}`]} ${program.dim ? styles.dim : ''}`} aria-hidden="true" />,
    document.body,
  );

  const colorLine = program.calmColor && (
    <p className={styles.color}>
      <span className={styles.swatch} style={{ '--swatch': color.swatch } as CSSProperties} aria-hidden="true" />
      {`오늘은 ${color.name}을 잠깐 찾아볼까?`}
    </p>
  );

  /* ─── 시작 전 ─── */
  if (phase === 'ready')
    return (
      <div className={styles.rest}>
        {backdrop}
        <p className={styles.intro}>{program.intro}</p>
        {colorLine}
        {program.note && <p className={styles.note}>{program.note}</p>}
        {program.safety && <p className={styles.note}>{program.safety}</p>}
        <div className={styles.choices} role="group" aria-label="시작하기">
          {program.steps ? (
            <button type="button" className={styles.primary} onClick={() => begin()}>
              시작
            </button>
          ) : null}
          {program.timers?.map((t) => (
            <button key={t.label} type="button" className={styles.primary} onClick={() => begin(t.seconds)}>
              {t.label}
            </button>
          ))}
          {program.untimedLabel && (
            <button type="button" className={program.timers ? styles.secondary : styles.primary} onClick={() => begin()}>
              {program.untimedLabel}
            </button>
          )}
          {program.quickExit && (
            <button type="button" className={styles.secondary} onClick={() => finish(program.quickExit!.message)}>
              {program.quickExit.label}
            </button>
          )}
        </div>
        <details className={styles.how}>
          <summary>어떻게 하면 돼?</summary>
          <ol>
            {experience.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </details>
        <EndHere onEnd={() => finish()} />
      </div>
    );

  /* ─── 단계형 (창밖 보기 · 스트레칭) ─── */
  if (program.steps) {
    const last = step === program.steps.length - 1;
    return (
      <div className={styles.rest}>
        {backdrop}
        <p className={styles.stepCount}>{`${step + 1} / ${program.steps.length}`}</p>
        <p className={styles.quiet} aria-live="polite">
          {program.steps[step]}
        </p>
        {program.safety && <p className={styles.note}>{program.safety}</p>}
        <div className={styles.choices}>
          {last ? (
            <button type="button" className={styles.secondary} onClick={() => finish()}>
              {program.endLabel}
            </button>
          ) : (
            <button type="button" className={styles.secondary} onClick={() => setStep((s) => s + 1)}>
              다음
            </button>
          )}
        </div>
        <EndHere onEnd={() => finish()} />
      </div>
    );
  }

  /* ─── 그냥 여기 있기: 화면을 누르면 선택지 ─── */
  if (program.tapToReveal && !revealed)
    return (
      <div className={styles.rest}>
        {backdrop}
        <button type="button" className={styles.tapArea} onClick={() => setRevealed(true)} aria-label="선택지 보기 (조금 더 · 이제 갈래)">
          <span className={styles.faint}>{program.restText}</span>
        </button>
      </div>
    );

  /* ─── 조용한 휴식 화면 ─── */
  const ended = timer.done;
  return (
    <div className={styles.rest}>
      {backdrop}
      {colorLine}
      <p className={styles.quiet}>{ended && program.afterTimer ? program.afterTimer : program.restText}</p>
      {timer.running && !ended && (
        <p className={styles.timer} role="timer" aria-label={`남은 시간 ${timer.label}`}>
          {timer.label}
        </p>
      )}
      <span className={styles.srOnly} aria-live="polite">
        {ended ? '시간이 됐어.' : ''}
      </span>
      <div className={styles.choices}>
        {program.tapToReveal && (
          <button type="button" className={styles.secondary} onClick={() => setRevealed(false)}>
            조금 더
          </button>
        )}
        {ended && program.moreSeconds && (
          <button type="button" className={styles.secondary} onClick={() => timer.start(program.moreSeconds!)}>
            {program.id === 'sounds' ? '조금 더 있을래' : '조금 더'}
          </button>
        )}
        {program.altEndLabel && (
          <button type="button" className={styles.secondary} onClick={() => finish()}>
            {program.altEndLabel}
          </button>
        )}
        <button type="button" className={styles.secondary} onClick={() => finish()}>
          {program.endLabel}
        </button>
      </div>
      {!program.tapToReveal && <EndHere onEnd={() => finish()} />}
    </div>
  );
}

/** 모든 REST에서 언제든 끝낼 수 있는 조용한 버튼 (기존 REST와 같은 문구) */
function EndHere({ onEnd }: { onEnd: () => void }) {
  return (
    <button type="button" className={styles.endHere} onClick={onEnd}>
      이 시간 마치기
    </button>
  );
}
