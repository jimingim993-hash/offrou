import { Link } from 'react-router-dom';
import { APP_BASE } from '@/app/paths';
import { SITE_INFO } from '@/data/site';
import styles from './site.module.css';

/** 확정된 정보만 표시한다. 회사·약관 정보가 없으면 그 줄은 그리지 않는다. */
export function SiteFooter() {
  const { company, legal } = SITE_INFO;
  const companyLines = [
    company.legalName && `상호 ${company.legalName}`,
    company.representative && `대표 ${company.representative}`,
    company.businessNumber && `사업자등록번호 ${company.businessNumber}`,
    company.mailOrderNumber && `통신판매업 신고 ${company.mailOrderNumber}`,
    company.address && `주소 ${company.address}`,
  ].filter(Boolean);

  const legalLinks = [
    { label: '개인정보처리방침', url: legal.privacyUrl },
    { label: '이용약관', url: legal.termsUrl },
  ];

  return (
    <footer className={styles.footer}>
      <div className={`${styles.container} ${styles.footerInner}`}>
        <div className={styles.footerBrand}>
          <p className={styles.footerWordmark}>
            {SITE_INFO.name} <span>{SITE_INFO.nameKo}</span>
          </p>
          <p className={styles.footerSlogan}>{SITE_INFO.slogan}</p>
          <p className={styles.footerAbout}>{SITE_INFO.about}</p>
        </div>

        <nav aria-label="하단 메뉴" className={styles.footerNav}>
          <ul>
            <li>
              <Link to={APP_BASE}>서비스</Link>
            </li>
            <li>
              <a href="#brand">브랜드</a>
            </li>
            <li>
              <a href="#contact">문의</a>
            </li>
          </ul>
          <ul className={styles.footerLegal}>
            {legalLinks.map((l) => (
              <li key={l.label}>{l.url ? <a href={l.url}>{l.label}</a> : <span>{l.label} (준비 중)</span>}</li>
            ))}
          </ul>
        </nav>

        {companyLines.length > 0 && (
          <address className={styles.company}>
            {companyLines.map((line) => (
              <span key={line as string}>{line}</span>
            ))}
          </address>
        )}

        <p className={styles.copyright}>
          © {new Date().getFullYear()} {SITE_INFO.name}
        </p>
      </div>
    </footer>
  );
}
