import { APP_VERSION } from '@/app/version';
import { isStandalone } from '@/pwa/install';
import type { SupportTechInfo } from './types';

/** 브라우저 종류 (대략, 버전·기기 식별 정보는 담지 않는다) */
export function browserName(ua: string): string {
  if (/KAKAOTALK/i.test(ua)) return 'KakaoTalk';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/CriOS|Chrome\//i.test(ua)) return 'Chrome';
  if (/FxiOS|Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua)) return 'Safari';
  return '기타';
}

export function osName(ua: string, maxTouchPoints = 0): string {
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPod/i.test(ua)) return 'iOS';
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)) return 'iPadOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return '기타';
}

/**
 * 문의에 함께 보내는 기술 정보 — 앱 버전·경로·브라우저 종류·OS·설치형 여부·화면 크기·(있으면) 콘텐츠 정보만.
 * 경로의 쿼리·해시는 빼고 보낸다 (선택 내용 등이 섞이지 않게).
 */
export function collectTechInfo(extra: Partial<SupportTechInfo> = {}, win: Window = window): SupportTechInfo {
  const nav = win.navigator;
  return {
    app_version: APP_VERSION,
    route: win.location.pathname.slice(0, 200),
    browser: browserName(nav.userAgent),
    os: osName(nav.userAgent, nav.maxTouchPoints ?? 0),
    is_pwa: isStandalone(win),
    screen: `${win.innerWidth}x${win.innerHeight}`,
    ...extra,
  };
}
