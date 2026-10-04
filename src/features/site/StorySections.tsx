import { Link } from 'react-router-dom';
import { APP_BASE } from '@/app/paths';
import { CATEGORIES } from '@/data/categories';
import { formatMinutes } from '@/data/durations';
import { CONTACT_TOPICS, SITE_INFO, SITE_MY_EXAMPLE_IDS } from '@/data/site';
import { getExperience, getStory } from '@/services/experiences';
import type { Experience } from '@/types/offrou';
import { Reveal } from './Reveal';
import styles from './site.module.css';

/** "열심히 하지 않아도 돼" */
export function NoPressureSection() {
  return (
    <section className={`${styles.section} ${styles.calm}`} aria-labelledby="calm-title">
      <div className={styles.container}>
        <Reveal>
          <h2 id="calm-title" className={styles.h2Large}>
            여기서는 잘하지 않아도 돼.
          </h2>
          <p className={styles.calmText}>
            OFFROU에는
            <br />
            레벨도, 순위도, 연속 출석도 필요하지 않아.
          </p>
          <p className={styles.calmText}>
            새로운 시간을 한번 보내봤다면
            <br />
            <strong>그걸로 충분해.</strong>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/** MY OFFROU 소개. 기록 예시는 실제 경험·결말 데이터에서 만든다. */
export function MyRecordSection() {
  const examples = SITE_MY_EXAMPLE_IDS.map((id) => getExperience(id)).filter((e): e is Experience => !!e);
  const endingOf = (e: Experience) =>
    e.interaction?.type === 'story' ? getStory(e.interaction.storyId)?.endings.find((x) => x.when?.length)?.title : undefined;

  return (
    <section id="my" className={`${styles.section} ${styles.sectionTint}`} aria-labelledby="my-title">
      <div className={`${styles.container} ${styles.split}`}>
        <Reveal>
          <p className={styles.eyebrow}>MY OFFROU</p>
          <h2 id="my-title" className={styles.h2}>
            지나온 시간은 조용히 남겨둘게.
          </h2>
          <p className={styles.lead}>
            OFFROU에서 보낸 시간은 MY OFFROU에 하나씩 쌓여. 몇 개를 했는지 겨루기 위한 기록이 아니라,
          </p>
          <p className={styles.quote}>“내가 이런 시간도 보내봤구나.”</p>
          <p className={styles.lead}>라고 돌아보기 위한 기록이야.</p>
        </Reveal>

        <Reveal>
          <figure className={styles.myMock} aria-label="MY OFFROU 화면 예시">
            <p className={styles.mockEyebrow}>MY OFFROU</p>
            <p className={styles.myMockTitle}>내가 보낸 시간들</p>
            <ul>
              {examples.map((e) => {
                const category = CATEGORIES.find((c) => c.id === e.categoryId);
                const ending = endingOf(e);
                return (
                  <li key={e.id}>
                    <span className={styles.myMockSymbol} aria-hidden="true">
                      {e.symbol ?? category?.symbol}
                    </span>
                    <span>
                      <strong>{e.title}</strong>
                      {ending && <em>“{ending}”</em>}
                      <small>
                        {category?.code} · {formatMinutes(e.minutes)}
                      </small>
                    </span>
                  </li>
                );
              })}
            </ul>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

/** 회원가입 정책: 기본 행동은 가입이 아니라 시작 */
export function NoSignupSection() {
  return (
    <section className={styles.section} aria-labelledby="nosignup-title">
      <div className={styles.container}>
        <Reveal className={styles.nosignup}>
          <h2 id="nosignup-title" className={styles.h2}>
            가입하지 않아도 괜찮아.
          </h2>
          <p className={styles.lead}>
            OFFROU는 바로 시작할 수 있어.
            <br />
            기록을 다른 기기에서도 이어가고 싶을 때만 계정을 만들면 돼.
          </p>
          <Link to={APP_BASE} className={styles.ctaPrimary}>
            OFFROU 시작하기
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/** 브랜드 스토리 */
export function BrandStorySection() {
  return (
    <section id="brand" className={`${styles.section} ${styles.sectionTint}`} aria-labelledby="brand-title">
      <div className={styles.container}>
        <Reveal>
          <p className={styles.eyebrow}>BRAND STORY</p>
          <h2 id="brand-title" className={styles.offRoute}>
            <span>OFF</span>
            <span className={styles.plus} aria-hidden="true">
              +
            </span>
            <span>ROUTE</span>
          </h2>
          <p className={styles.offRouteNote}>반복되는 ROUTE에서 잠시 OFF. 그렇게 만나는 평소와 다른 시간.</p>
        </Reveal>
        <Reveal className={styles.storyText}>
          <p>
            우리는 매일 비슷한 길을 걷고,
            <br />
            비슷한 일을 하고,
            <br />
            비슷한 시간을 보낸다.
          </p>
          <p>OFFROU는 그 ROUTE에서 잠시 OFF하는 순간을 만들기 위해 시작되었다.</p>
          <p>
            거창한 여행이 아니어도 되고,
            <br />
            새로운 인생을 시작하지 않아도 된다.
          </p>
          <p>
            5분이어도, 10분이어도,
            <br />
            평소와 조금 다른 시간을 보냈다면 충분하다.
          </p>
          <blockquote className={styles.philosophy}>
            OFFROU는 {SITE_INFO.philosophy.replace(/\.$/, '')}.
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}

/** 문의. 실제 연락처가 없으면 '준비 중'으로 둔다 (가짜 이메일 금지). */
export function ContactSection() {
  const email = SITE_INFO.contact.email;
  return (
    <section id="contact" className={styles.section} aria-labelledby="contact-title">
      <div className={styles.container}>
        <Reveal>
          <h2 id="contact-title" className={styles.h2}>
            OFFROU와 이야기하고 싶다면
          </h2>
          <ul className={styles.topics}>
            {CONTACT_TOPICS.map((topic) => (
              <li key={topic}>
                {email ? (
                  <a href={`mailto:${email}?subject=${encodeURIComponent(`[OFFROU] ${topic}`)}`}>{topic}</a>
                ) : (
                  <span>{topic}</span>
                )}
              </li>
            ))}
          </ul>
          <p className={styles.contactNote} role="note">
            {email ? (
              <>
                메일로 보내줘: <a href={`mailto:${email}`}>{email}</a>
              </>
            ) : (
              '문의 창구를 준비하고 있어요. 곧 이곳에서 바로 연결할게요.'
            )}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
