import { Link } from 'react-router-dom';
import { APP_BASE } from '@/app/paths';
import { CATEGORIES } from '@/data/categories';
import { formatMinutes } from '@/data/durations';
import { SITE_SHOWCASE_IDS, SITE_STORY_IDS } from '@/data/site';
import { STORIES } from '@/data/stories';
import { getExperience } from '@/services/experiences';
import { experiencePath } from '@/features/experience/paths';
import type { Experience } from '@/types/offrou';
import { Reveal } from './Reveal';
import styles from './site.module.css';

/** id 목록 → 실제 경험 (없는 id는 빠진다) */
const pick = (ids: string[]) => ids.map((id) => getExperience(id)).filter((e): e is Experience => !!e);

/** 다섯 가지 OFFROU — 카테고리 데이터에서 그린다 */
export function FiveTimesSection() {
  return (
    <section id="times" className={styles.section} aria-labelledby="times-title">
      <div className={styles.container}>
        <Reveal>
          <p className={styles.eyebrow}>FIVE TIMES</p>
          <h2 id="times-title" className={styles.h2}>
            OFFROU가 건네는 다섯 가지 시간
          </h2>
        </Reveal>
        <ul className={styles.times}>
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Reveal className={styles.timeCard}>
                <span className={styles.timeSymbol} aria-hidden="true">
                  {c.symbol}
                </span>
                <p className={styles.code}>{c.code}</p>
                <h3 className={styles.h3}>{c.short}</h3>
                <p className={styles.timeIntro}>{c.intro}</p>
                <Link to={`${APP_BASE}/discover/${c.id}`} className={styles.textLink} aria-label={`${c.code} ${c.short} 둘러보기`}>
                  둘러보기 <span aria-hidden="true">→</span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** 실제 경험 미리보기 3~6개 — 콘텐츠 데이터에서 가져온다 */
export function PreviewSection() {
  const items = pick(SITE_SHOWCASE_IDS).slice(0, 6);
  if (items.length === 0) return null;

  return (
    <section id="preview" className={`${styles.section} ${styles.sectionTint}`} aria-labelledby="preview-title">
      <div className={styles.container}>
        <Reveal>
          <h2 id="preview-title" className={styles.h2}>
            이런 시간을 보낼 수 있어.
          </h2>
          <p className={styles.lead}>지금 OFFROU에 있는 시간 중 몇 가지를 꺼내봤어.</p>
        </Reveal>
        <ul className={styles.previews}>
          {items.map((e) => {
            const category = CATEGORIES.find((c) => c.id === e.categoryId);
            return (
              <li key={e.id}>
                <Reveal>
                  <Link to={experiencePath(e.id)} className={styles.previewCard}>
                    <span className={styles.previewSymbol} aria-hidden="true">
                      {e.symbol ?? category?.symbol}
                    </span>
                    <h3 className={styles.h3}>{e.title}</h3>
                    <span className={styles.previewInvite}>{e.invite}</span>
                    <span className={styles.previewMeta}>
                      {category?.code} · {formatMinutes(e.minutes)}
                    </span>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** EXPERIENCE 강조 */
export function ExperienceHighlightSection() {
  const stories = pick(SITE_STORY_IDS);

  return (
    <section id="experience" className={styles.section} aria-labelledby="experience-title">
      <div className={styles.container}>
        <Reveal className={styles.highlight}>
          <p className={styles.eyebrow}>EXPERIENCE</p>
          <h2 id="experience-title" className={styles.h2}>
            잠깐 다른 사람이 되어보는 것도 괜찮아.
          </h2>
          <p className={styles.lead}>
            오늘은 작은 서점의 주인이 되고,
            <br />
            어떤 날은 심야 라디오 DJ가 되고,
            <br />또 어떤 날은 낯선 도시를 걷는다.
          </p>
          <p className={styles.highlightStrong}>몇 분 동안 다른 하루를 살아보는 것.</p>
          <p className={styles.lead}>그것도 OFFROU가 만드는 새로운 시간이야.</p>
          <ul className={styles.storyChips} aria-label="EXPERIENCE 이야기 예시">
            {stories.map((e) => (
              <li key={e.id}>
                <Link to={experiencePath(e.id)}>
                  <span aria-hidden="true">{e.symbol}</span> {e.title}
                </Link>
              </li>
            ))}
          </ul>
          <p className={styles.storyCount}>지금 {STORIES.length}개의 이야기가 기다리고 있어.</p>
          <Link to={`${APP_BASE}/discover/experience`} className={styles.ctaPrimary}>
            EXPERIENCE 만나보기
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
