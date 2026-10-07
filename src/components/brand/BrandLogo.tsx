import styles from './BrandLogo.module.css';

/**
 * OFFROU 공식 로고 (OFF + ROUTE: 익숙한 경로에서 잠시 벗어나 평소와 다른 시간을).
 * - full: 심볼 + OFFROU 워드마크 (홈페이지 헤더·히어로·브랜드 영역)
 * - symbol: 심볼만 (작은 영역·장식)
 * 원본 이미지는 public/brand. 밝은/어두운 배경은 이미지 변형으로 바꾼다 (CSS 필터로 반전하지 않음).
 * theme 'auto'는 화면 테마(시스템 설정 또는 <html data-theme>)를 따른다.
 */
export type BrandTheme = 'auto' | 'light' | 'dark';

const SRC = {
  symbol: '/brand/offrou-symbol.png',
  /** 어두운 배경용 (밝은 글자) */
  fullOnDark: '/brand/offrou-logo-dark.png',
  /** 밝은 배경용 (어두운 글자) */
  fullOnLight: '/brand/offrou-logo-light.png',
} as const;

/** 원본 비율 (가로/세로) */
const RATIO = { full: 1007 / 195, symbol: 1 } as const;

export function BrandLogo({
  variant = 'full',
  theme = 'auto',
  height = 24,
  alt = 'OFFROU',
  decorative = false,
  className = '',
}: {
  variant?: 'full' | 'symbol';
  theme?: BrandTheme;
  /** 표시 높이(px) */
  height?: number;
  alt?: string;
  /** 바로 옆에 이름이 따로 있으면 true → 화면 읽기 프로그램이 두 번 읽지 않게 */
  decorative?: boolean;
  className?: string;
}) {
  const width = Math.round(height * RATIO[variant]);
  const common = {
    alt: decorative ? '' : alt,
    'aria-hidden': decorative || undefined,
    width,
    height,
    decoding: 'async' as const,
    draggable: false,
  };

  if (variant === 'symbol') return <img {...common} src={SRC.symbol} className={`${styles.logo} ${className}`} />;
  if (theme === 'light') return <img {...common} src={SRC.fullOnLight} className={`${styles.logo} ${className}`} />;
  if (theme === 'dark') return <img {...common} src={SRC.fullOnDark} className={`${styles.logo} ${className}`} />;
  // auto: 두 변형 중 지금 테마에 맞는 하나만 보인다 (숨은 쪽은 화면 읽기에서도 빠진다)
  return (
    <span className={`${styles.auto} ${className}`}>
      <img {...common} src={SRC.fullOnLight} className={`${styles.logo} ${styles.onLight}`} />
      <img {...common} src={SRC.fullOnDark} className={`${styles.logo} ${styles.onDark}`} />
    </span>
  );
}
