import type { ComponentType } from 'react';

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const HomeIcon = () => (
  <svg {...iconProps}>
    <path d="M4 11.5 12 5l8 6.5" />
    <path d="M6.5 10v8.5h11V10" />
  </svg>
);

const CompassIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </svg>
);

const MyIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="9" r="3.5" />
    <path d="M5.5 19c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
  </svg>
);

export interface NavItem {
  to: string;
  label: string;
  Icon: ComponentType;
  end?: boolean;
}

/** 하단 내비게이션 항목. 메뉴 추가 시 여기만 수정한다. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'HOME', Icon: HomeIcon, end: true },
  { to: '/discover', label: '발견', Icon: CompassIcon },
  { to: '/my', label: 'MY', Icon: MyIcon },
];
