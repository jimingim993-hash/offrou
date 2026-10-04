import { useEffect } from 'react';
import { SITE_INFO } from '@/data/site';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { HeroSection } from './HeroSection';
import { HowItWorksSection, MomentsSection } from './IntroSections';
import { ExperienceHighlightSection, FiveTimesSection, PreviewSection } from './TimesSections';
import { BrandStorySection, ContactSection, MyRecordSection, NoPressureSection, NoSignupSection } from './StorySections';
import styles from './site.module.css';

export const SITE_TITLE = `${SITE_INFO.name} | ${SITE_INFO.slogan.replace(/\.$/, '')}`;

/**
 * OFFROU 공식 홈페이지 ('/').
 * 브랜드와 서비스를 소개하고, 언제든 실제 서비스(/app)로 시작할 수 있게 한다.
 * 서비스(/app)와 같은 데이터·디자인 토큰을 쓰지만, 계정·동기화 코드는 불러오지 않는다.
 */
export function SitePage() {
  useEffect(() => {
    document.title = SITE_TITLE;
  }, []);

  return (
    <div className={styles.site}>
      <a href="#main" className={styles.skip}>
        본문으로 건너뛰기
      </a>
      <SiteHeader />
      <main id="main">
        <HeroSection />
        <MomentsSection />
        <HowItWorksSection />
        <FiveTimesSection />
        <PreviewSection />
        <ExperienceHighlightSection />
        <NoPressureSection />
        <MyRecordSection />
        <NoSignupSection />
        <BrandStorySection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}
