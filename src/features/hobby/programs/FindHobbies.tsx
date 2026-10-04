import { useId, useState } from 'react';
import { COLLAGE_PROMPTS, MUSIC_MISSIONS, PAPER_ACTIVITIES, PHOTO_THEMES, PHOTO_TIPS, PLAYLIST_THEMES } from '@/data/hobby/pools';
import { pickOne } from '@/services/random';
import { OptionalTimer } from '@/components/experience/OptionalTimer';
import { Actions, Lead, PlayButton } from '@/features/play/parts';
import type { HobbyViewProps } from '../types';
import styles from '@/features/play/play.module.css';
import own from '../hobby.module.css';

/** 사진 취미 맛보기 — 카메라 권한을 요구하지 않고, 사진도 올리지 않는다 */
export function PhotoHobby({ program, onDone }: HobbyViewProps) {
  const [theme, setTheme] = useState(() => pickOne(PHOTO_THEMES));
  const [tip] = useState(() => pickOne(PHOTO_TIPS));
  return (
    <>
      <p className={styles.eyebrow}>오늘의 사진 주제</p>
      <p className={styles.big}>{`오늘은 ${theme}을(를) 찾아봐.`}</p>
      <Lead>{program.instruction}</Lead>
      <p className={styles.hint}>{`작은 팁: ${tip}`}</p>
      <p className={styles.hint}>사진은 네 휴대폰에만 남아. OFFROU로 올라가지 않아.</p>
      <OptionalTimer minutes={program.optionalTimerMinutes} />
      <Actions>
        <PlayButton onClick={onDone}>찍었어</PlayButton>
        <PlayButton variant="ghost" onClick={() => setTheme((t) => pickOne(PHOTO_THEMES, Math.random, t))}>
          다른 주제
        </PlayButton>
      </Actions>
    </>
  );
}

/** 음악 탐색 — 미션만 건넨다 (음악 재생·링크 없음) */
export function MusicHobby({ program, onDone }: HobbyViewProps) {
  const [mission, setMission] = useState(() => pickOne(MUSIC_MISSIONS));
  return (
    <>
      <p className={styles.eyebrow}>오늘의 음악 미션</p>
      <p className={styles.big}>{mission}</p>
      <Lead>{program.instruction}</Lead>
      <Actions>
        <PlayButton onClick={onDone}>찾았어</PlayButton>
        <PlayButton variant="ghost" onClick={() => setMission((m) => pickOne(MUSIC_MISSIONS, Math.random, m))}>
          다른 미션
        </PlayButton>
      </Actions>
    </>
  );
}

/** 쉬운 종이 활동 — 활동 고르기 → 준비물 → 단계별 (이전/다음) → 완성 */
export function PaperHobby({ program, onDone }: HobbyViewProps) {
  const [activityId, setActivityId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const activity = PAPER_ACTIVITIES.find((a) => a.id === activityId);

  if (!activity)
    return (
      <>
        <Lead>무엇을 만들어볼까?</Lead>
        <div className={styles.answers} role="group" aria-label="종이 활동 고르기">
          {PAPER_ACTIVITIES.map((a) => (
            <button
              key={a.id}
              type="button"
              className={styles.answer}
              onClick={() => {
                setActivityId(a.id);
                setStep(-1);
              }}
            >
              {a.title}
            </button>
          ))}
        </div>
      </>
    );

  if (step < 0)
    return (
      <>
        <p className={styles.big}>{activity.title}</p>
        <p className={styles.eyebrow}>시작 전에 준비해줘</p>
        <ul className={own.list} aria-label="준비물">
          {activity.supplies.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <Actions>
          <PlayButton onClick={() => setStep(0)}>준비됐어</PlayButton>
          <PlayButton variant="quiet" onClick={() => setActivityId(null)}>
            다른 활동
          </PlayButton>
        </Actions>
      </>
    );

  const last = step === activity.steps.length - 1;
  return (
    <>
      <p className={styles.eyebrow}>{`${activity.title} · ${step + 1} / ${activity.steps.length}`}</p>
      <p className={styles.big} aria-live="polite">
        {activity.steps[step]}
      </p>
      <Lead>{program.instruction}</Lead>
      <Actions>
        {last ? <PlayButton onClick={onDone}>다 만들었어</PlayButton> : <PlayButton onClick={() => setStep((s) => s + 1)}>다음</PlayButton>}
        <PlayButton variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
          이전
        </PlayButton>
      </Actions>
    </>
  );
}

/** 콜라주 아이디어 — 사진첩에서 하나씩 (업로드 없음) */
export function CollageHobby({ program, onDone }: HobbyViewProps) {
  const [prompts] = useState(() => [COLLAGE_PROMPTS[0], COLLAGE_PROMPTS[1], COLLAGE_PROMPTS[2]]);
  const [picked, setPicked] = useState(0);

  return (
    <>
      <Lead>{program.instruction}</Lead>
      <ol className={own.checklist} aria-label="고를 사진">
        {prompts.map((p, i) => (
          <li key={p} className={i < picked ? own.done : i === picked ? own.current : undefined}>
            <span aria-hidden="true">{i < picked ? '✓' : `${i + 1}`}</span> {p}
            {i < picked && <span className={own.srOnly}> (골랐어)</span>}
          </li>
        ))}
      </ol>
      <Actions>
        {picked < prompts.length ? (
          <PlayButton onClick={() => setPicked((n) => n + 1)}>{`${picked + 1}번째 골랐어`}</PlayButton>
        ) : (
          <PlayButton onClick={onDone}>다 골랐어</PlayButton>
        )}
      </Actions>
      <p className={styles.hint}>사진은 올리지 않아. 고른 세 장을 나란히 떠올려보면 오늘의 콜라주야.</p>
    </>
  );
}

/** 작은 플레이리스트 — 테마 → 1곡 → 2곡 → 3곡 (곡 이름 입력은 선택, 저장 안 함) */
export function PlaylistHobby({ program, onDone }: HobbyViewProps) {
  const [theme, setTheme] = useState(() => pickOne(PLAYLIST_THEMES));
  const [songs, setSongs] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const inputId = useId();
  const n = songs.length;

  return (
    <>
      <p className={styles.eyebrow}>오늘의 테마</p>
      <p className={styles.big}>{theme}</p>
      <Lead>{program.instruction}</Lead>
      <ol className={own.checklist} aria-label="고른 곡">
        {[0, 1, 2].map((i) => (
          <li key={i} className={i < n ? own.done : i === n ? own.current : undefined}>
            <span aria-hidden="true">{i < n ? '✓' : `${i + 1}`}</span> {i < n ? songs[i] || `${i + 1}번째 곡` : `${i + 1}번째 곡`}
          </li>
        ))}
      </ol>
      {n < 3 ? (
        <>
          <label className={styles.noteLabel} htmlFor={inputId}>
            {`${n + 1}번째 곡 이름 (적지 않아도 돼, 저장되지 않아)`}
          </label>
          <input id={inputId} className={own.input} value={draft} maxLength={60} onChange={(e) => setDraft(e.target.value)} />
          <Actions>
            <PlayButton
              onClick={() => {
                setSongs((s) => [...s, draft.trim()]);
                setDraft('');
              }}
            >
              {`${n + 1}곡 골랐어`}
            </PlayButton>
            {n === 0 && (
              <PlayButton variant="ghost" onClick={() => setTheme((t) => pickOne(PLAYLIST_THEMES, Math.random, t))}>
                다른 테마
              </PlayButton>
            )}
          </Actions>
        </>
      ) : (
        <Actions>
          <PlayButton onClick={onDone}>완성</PlayButton>
        </Actions>
      )}
    </>
  );
}

