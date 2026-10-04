import { useId, useState, type CSSProperties } from 'react';
import { CARD_LINES, NAMED_COLORS } from '@/data/hobby/pools';
import type { NamedColor } from '@/data/hobby/types';
import { Actions, Lead, PlayButton } from '@/features/play/parts';
import type { HobbyViewProps } from '../types';
import styles from '@/features/play/play.module.css';
import own from '../hobby.module.css';

/** 이름이 함께 보이는 색 버튼 (색만으로 정보를 주지 않는다) */
function ColorButton({ color, on, onClick, disabled }: { color: NamedColor; on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`${own.colorButton} ${on ? own.colorOn : ''}`}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
    >
      <span className={own.chip} style={{ '--chip': color.hex } as CSSProperties} aria-hidden="true" />
      {color.name}
    </button>
  );
}

/** 색 조합 — 마음에 드는 색 세 개 → "오늘의 색" (점수·전문 지식 없음) */
export function ColorComboHobby({ program, onDone }: HobbyViewProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const [shown, setShown] = useState(false);
  const chosen = picked.map((n) => NAMED_COLORS.find((c) => c.name === n)!);

  if (shown)
    return (
      <>
        <p className={styles.eyebrow}>오늘의 색</p>
        <ul className={own.palette} aria-label={`오늘의 색: ${picked.join(', ')}`}>
          {chosen.map((c) => (
            <li key={c.name} style={{ background: c.hex, color: c.ink }}>
              {c.name}
            </li>
          ))}
        </ul>
        <Actions>
          <PlayButton onClick={onDone}>마음에 들어</PlayButton>
          <PlayButton variant="ghost" onClick={() => setShown(false)}>
            다시 고르기
          </PlayButton>
        </Actions>
      </>
    );

  const toggle = (name: string) => setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : p.length < 3 ? [...p, name] : p));
  return (
    <>
      <Lead>{`${program.instruction} (${picked.length} / 3)`}</Lead>
      <div className={own.colors} role="group" aria-label="색 고르기">
        {NAMED_COLORS.map((c) => (
          <ColorButton
            key={c.name}
            color={c}
            on={picked.includes(c.name)}
            disabled={picked.length >= 3 && !picked.includes(c.name)}
            onClick={() => toggle(c.name)}
          />
        ))}
      </div>
      <Actions>
        <PlayButton onClick={() => setShown(true)} disabled={picked.length < 3}>
          오늘의 색 보기
        </PlayButton>
      </Actions>
    </>
  );
}

type Align = 'left' | 'center' | 'right';
const ALIGNS: { id: Align; label: string }[] = [
  { id: 'left', label: '왼쪽' },
  { id: 'center', label: '가운데' },
  { id: 'right', label: '오른쪽' },
];

/** 한 장 디자인 — 배경색 · 짧은 문장 · 정렬만. 화면에서만 보여주고 저장하지 않는다. */
export function OneCardHobby({ program, onDone }: HobbyViewProps) {
  const [bg, setBg] = useState<NamedColor>(NAMED_COLORS[10]);
  const [text, setText] = useState<string>(CARD_LINES[0]);
  const [align, setAlign] = useState<Align>('center');
  const textId = useId();

  return (
    <>
      <Lead>{program.instruction}</Lead>
      <figure className={own.card} style={{ background: bg.hex, color: bg.ink, textAlign: align }} aria-label="만든 카드 미리보기">
        <p className={own.cardText}>{text || ' '}</p>
      </figure>

      <fieldset className={own.fieldset}>
        <legend className={own.legend}>배경색</legend>
        <div className={own.colors}>
          {NAMED_COLORS.map((c) => (
            <ColorButton key={c.name} color={c} on={bg.name === c.name} onClick={() => setBg(c)} />
          ))}
        </div>
      </fieldset>

      <fieldset className={own.fieldset}>
        <legend className={own.legend}>문장</legend>
        <div className={styles.answers}>
          {CARD_LINES.slice(0, 4).map((l) => (
            <button key={l} type="button" className={`${styles.answer} ${text === l ? styles.answerOn : ''}`} aria-pressed={text === l} onClick={() => setText(l)}>
              {l}
            </button>
          ))}
        </div>
        <label className={styles.noteLabel} htmlFor={textId}>
          직접 쓰기 (20자까지, 저장되지 않아)
        </label>
        <input id={textId} className={own.input} value={text} maxLength={20} onChange={(e) => setText(e.target.value)} />
      </fieldset>

      <fieldset className={own.fieldset}>
        <legend className={own.legend}>글자 정렬</legend>
        <div className={styles.answers}>
          {ALIGNS.map((a) => (
            <button key={a.id} type="button" className={`${styles.answer} ${align === a.id ? styles.answerOn : ''}`} aria-pressed={align === a.id} onClick={() => setAlign(a.id)}>
              {a.label}
            </button>
          ))}
        </div>
      </fieldset>

      <Actions>
        <PlayButton onClick={onDone}>완성했어</PlayButton>
      </Actions>
    </>
  );
}
