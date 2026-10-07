import { Link } from 'react-router-dom';
import { APP_BASE } from '@/app/paths';
import { MOODS } from '@/data/moods';
import styles from './site.module.css';
import { BrandLogo } from '@/components/brand/BrandLogo';

/** 첫 화면: 워드마크 · 대표 문구 · 서비스 시작 */
export function HeroSection() {
  return (
    <section id="top" className={styles.hero} aria-labelledby="hero-title">
      <div className={`${styles.container} ${styles.heroInner}`}>
        <div className={styles.heroText}>
          <p className={styles.heroBrand}>
            <BrandLogo height={30} alt="OFFROU" />
            <span className={styles.heroBrandKo}>오프루</span>
          </p>
          <h1 id="hero-title" className={styles.heroTitle}>
            같은 하루에,{' '}
            <br />
            <span>다른 시간을.</span>
          </h1>
          <p className={styles.heroSub}>
            반복되는 하루에서 잠시 벗어나
            <br />
            평소와 다른 시간을 만나보세요.
          </p>
          <div className={styles.ctaRow}>
            <Link to={APP_BASE} className={styles.ctaPrimary}>
              OFFROU 시작하기
            </Link>
            <a href="#times" className={styles.ctaGhost}>
              어떤 시간이 있는지 보기
            </a>
          </div>
          <p className={styles.heroNote}>가입하지 않아도 바로 시작할 수 있어요.</p>
        </div>

        {/* 실제 서비스 첫 화면을 작게 보여주는 장식 (선택지는 실제 데이터) */}
        <div className={styles.heroArt} aria-hidden="true">
          <div className={styles.phone}>
            <p className={styles.phoneBrand}>
              <BrandLogo variant="symbol" height={16} decorative />
              OFFROU
            </p>
            <p className={styles.phoneTitle}>
              오늘도 비슷한 하루였어?
              <br />
              <span>잠깐 다른 시간으로 가볼까?</span>
            </p>
            <div className={styles.phoneGrid}>
              {MOODS.slice(0, 4).map((m) => (
                <span key={m.id} className={styles.phoneChoice}>
                  <span>{m.symbol}</span>
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
