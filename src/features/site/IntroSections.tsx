import { DURATIONS } from '@/data/durations';
import { formatMinutes } from '@/data/durations';
import { MOODS } from '@/data/moods';
import { SITE_HOW_EXAMPLE_ID } from '@/data/site';
import { getExperience } from '@/services/experiences';
import { Reveal } from './Reveal';
import styles from './site.module.css';

const MOMENTS = [
  '오늘도 똑같은 하루였을 때',
  '뭔가 하고 싶은데 뭘 해야 할지 모르겠을 때',
  '잠깐 아무 생각 없이 쉬고 싶을 때',
  '새로운 걸 해보고 싶은데 거창하게 시작하기 싫을 때',
  '그냥 심심할 때',
];

/** OFFROU가 필요한 순간 */
export function MomentsSection() {
  return (
    <section id="moments" className={styles.section} aria-labelledby="moments-title">
      <div className={styles.container}>
        <Reveal>
          <h2 id="moments-title" className={styles.h2}>
            이런 순간 있지 않아?
          </h2>
          <ul className={styles.moments}>
            {MOMENTS.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <p className={styles.momentsEnd}>그럴 때 OFFROU를 열어봐.</p>
        </Reveal>
      </div>
    </section>
  );
}

/** 사용 방식 3단계. 화면 예시의 선택지·경험은 실제 데이터를 쓴다. */
export function HowItWorksSection() {
  const example = getExperience(SITE_HOW_EXAMPLE_ID);
  const steps = [
    {
      title: '지금 어떤 시간이 필요한지 골라.',
      body: '쉬고 싶은지, 놀고 싶은지, 새로운 걸 해보고 싶은지.',
      mock: (
        <div className={styles.mockChips}>
          {MOODS.slice(0, 3).map((m) => (
            <span key={m.id}>
              {m.symbol} {m.label}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: '얼마나 시간이 있는지 알려줘.',
      body: '5분이어도 괜찮고, 한 시간이어도 괜찮아.',
      mock: (
        <div className={styles.mockChips}>
          {DURATIONS.map((d) => (
            <span key={d.id}>{d.label}</span>
          ))}
        </div>
      ),
    },
    {
      title: 'OFFROU가 하나의 시간을 건네줄게.',
      body: '고민하지 말고 그 시간을 한번 보내봐.',
      mock: example && (
        <div className={styles.mockCard}>
          <span className={styles.mockEyebrow}>오늘의 OFFROU</span>
          <strong>{example.invite}</strong>
          <span>{formatMinutes(example.minutes)}</span>
        </div>
      ),
    },
  ];

  return (
    <section id="service" className={`${styles.section} ${styles.sectionTint}`} aria-labelledby="how-title">
      <div className={styles.container}>
        <Reveal>
          <p className={styles.eyebrow}>HOW IT WORKS</p>
          <h2 id="how-title" className={styles.h2}>
            고민은 짧게, 시간은 다르게.
          </h2>
        </Reveal>
        <ol className={styles.steps}>
          {steps.map((s, i) => (
            <li key={s.title}>
              <Reveal className={styles.step}>
                <span className={styles.stepNum} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className={styles.h3}>{s.title}</h3>
                <p className={styles.stepBody}>{s.body}</p>
                <div className={styles.mock} aria-hidden="true">
                  {s.mock}
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
        <Reveal>
          <p className={styles.howMore}>
            고르기도 귀찮은 날엔 <strong>지금 딱 하나</strong>, 조금 길게 보내고 싶은 날엔{' '}
            <strong>작은 OFFROU 코스</strong>도 있어.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
