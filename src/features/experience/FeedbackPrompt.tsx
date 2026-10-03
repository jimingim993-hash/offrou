import { useStoreVersion } from '@/hooks/useStoreVersion';
import { getFeedbackFor, setFeedback } from '@/services/feedback';
import type { Experience, FeedbackValue } from '@/types/offrou';
import styles from './FeedbackPrompt.module.css';

const OPTIONS: { value: FeedbackValue; label: string }[] = [
  { value: 'good', label: '좋았어' },
  { value: 'meh', label: '그냥 그랬어' },
];

/** 완료 후 아주 가벼운 피드백. 누르지 않아도 되고, 누른 뒤에도 바꿀 수 있다. */
export function FeedbackPrompt({ recordId, experience }: { recordId: string; experience: Experience }) {
  useStoreVersion();
  const current = getFeedbackFor(recordId);

  return (
    <section className={styles.feedback} aria-labelledby="feedback-q">
      <p id="feedback-q" className={styles.question}>
        이 시간은 어땠어?
      </p>
      <div className={styles.options}>
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`${styles.option} ${current === o.value ? styles.on : ''}`}
            aria-pressed={current === o.value}
            onClick={() =>
              setFeedback({ id: recordId, experienceId: experience.id, categoryId: experience.categoryId }, o.value)
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className={styles.thanks} aria-live="polite">
        {current ? '알려줘서 고마워. 다음 시간에 조금씩 반영할게.' : ''}
      </p>
    </section>
  );
}
