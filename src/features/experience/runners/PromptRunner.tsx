import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ProgressDots } from '@/components/ui/ProgressDots';
import type { RunnerProps } from './types';
import styles from './runners.module.css';

const pickOne = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** 이번에 고른 값과 다른 것으로 (후보가 하나면 그대로) */
const pickOther = <T,>(list: T[], current: T) => {
  const others = list.filter((x) => x !== current);
  return others.length ? pickOne(others) : current;
};

/** {color} 같은 자리를 이번 실행에서 고른 값으로 채운다 */
const fill = (text: string, picks: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (m, k: string) => picks[k] ?? m);

/** PLAY: 할 일을 한 번에 하나씩. 대답 버튼을 누르면 다음으로. 점수·승패는 없다. */
export function PromptRunner({ experience, onFinish }: RunnerProps) {
  const interaction = experience.interaction?.type === 'prompts' ? experience.interaction : undefined;
  const prompts = interaction?.prompts ?? [];
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(interaction?.vars ?? {}).map(([k, list]) => [k, pickOne(list)])),
  );

  const prompt = prompts[index];
  if (!prompt) return null;
  const last = index === prompts.length - 1;
  // 이 문장에 들어간 랜덤 값(색깔·단어·주제…)은 마음에 안 들면 바꿀 수 있다
  const keys = [...prompt.text.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .filter((k) => (interaction?.vars?.[k]?.length ?? 0) > 1);
  const reroll = () =>
    setPicks((prev) => ({ ...prev, ...Object.fromEntries(keys.map((k) => [k, pickOther(interaction!.vars![k], prev[k])])) }));

  return (
    <div className={styles.stack}>
      <ProgressDots total={prompts.length} current={index + 1} />
      <p key={index} className={`${styles.bigText} rise`}>
        {fill(prompt.text, picks)}
      </p>
      <div className={styles.finish}>
        <Button block onClick={() => (last ? onFinish() : setIndex(index + 1))}>
          {prompt.action}
        </Button>
        {keys.length > 0 && (
          <button type="button" className={styles.reroll} onClick={reroll}>
            <span aria-hidden="true">🎲 </span>다른 걸로 바꿔줘
          </button>
        )}
      </div>
    </div>
  );
}
