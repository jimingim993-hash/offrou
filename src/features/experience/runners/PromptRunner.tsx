import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ProgressDots } from '@/components/ui/ProgressDots';
import type { RunnerProps } from './types';
import styles from './runners.module.css';

const pickOne = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** {color} 같은 자리를 이번 실행에서 고른 값으로 채운다 */
const fill = (text: string, picks: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (m, k: string) => picks[k] ?? m);

/** PLAY: 할 일을 한 번에 하나씩. 대답 버튼을 누르면 다음으로. */
export function PromptRunner({ experience, onFinish }: RunnerProps) {
  const interaction = experience.interaction?.type === 'prompts' ? experience.interaction : undefined;
  const prompts = interaction?.prompts ?? [];
  const [index, setIndex] = useState(0);
  const [picks] = useState(() =>
    Object.fromEntries(Object.entries(interaction?.vars ?? {}).map(([k, list]) => [k, pickOne(list)])),
  );

  const prompt = prompts[index];
  if (!prompt) return null;
  const last = index === prompts.length - 1;

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
      </div>
    </div>
  );
}
