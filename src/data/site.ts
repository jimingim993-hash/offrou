/**
 * 공식 홈페이지 설정.
 * - 확정되지 않은 회사·연락처·약관 정보는 null로 둔다. null이면 화면에 표시하지 않는다 (가짜 정보 금지).
 * - 실제 정보가 생기면 이 파일의 값만 채우면 홈페이지 하단·문의 영역에 반영된다.
 */
export interface SiteInfo {
  name: string;
  nameKo: string;
  slogan: string;
  philosophy: string;
  /** 한 줄 소개 (푸터 등) */
  about: string;
  company: {
    /** 상호/법인명 */
    legalName: string | null;
    /** 대표자 */
    representative: string | null;
    /** 사업자등록번호 */
    businessNumber: string | null;
    /** 통신판매업 신고번호 */
    mailOrderNumber: string | null;
    address: string | null;
  };
  contact: {
    /** 실제 문의 이메일. 없으면 "문의 준비 중"으로 보인다 */
    email: string | null;
  };
  legal: {
    privacyUrl: string | null;
    termsUrl: string | null;
  };
}

export const SITE_INFO: SiteInfo = {
  name: 'OFFROU',
  nameKo: '오프루',
  slogan: '같은 하루에, 다른 시간을.',
  philosophy: '사람에게 새로운 시간을 제공한다.',
  about: '사람에게 새로운 시간을 제공하는 B2C 경험·여가 브랜드.',
  company: {
    legalName: null,
    representative: null,
    businessNumber: null,
    mailOrderNumber: null,
    address: null,
  },
  contact: { email: null },
  legal: { privacyUrl: null, termsUrl: null },
};

/** 문의 종류 (실제 연락처가 생기면 메일 제목으로 쓰인다) */
export const CONTACT_TOPICS = ['서비스 문의', '콘텐츠 제안', '제휴 문의', '기타 문의'] as const;

/**
 * 홈페이지 "미리보기"에 보여줄 실제 경험 id.
 * 콘텐츠는 src/data/experiences에서 가져온다 — 여기에는 고르는 목록만 둔다.
 * 없는 id는 자동으로 빠진다.
 */
export const SITE_SHOWCASE_IDS = [
  'exp-bookstore',
  'hobby-drawing',
  'out-new-route',
  'rest-window',
  'play-color-hunt',
  'exp-radio-dj',
];

/** EXPERIENCE 강조 영역에서 이름을 부를 이야기 */
export const SITE_STORY_IDS = ['exp-bookstore', 'exp-radio-dj', 'exp-strange-city'];

/** "사용 방식" 3단계에서 OFFROU가 건네는 시간 예시로 보여줄 실제 경험 */
export const SITE_HOW_EXAMPLE_ID = 'hobby-new-genre';

/** "MY OFFROU" 소개에서 기록 예시로 보여줄 실제 경험 */
export const SITE_MY_EXAMPLE_IDS = ['exp-radio-dj', 'rest-window'];
