import { Suspense, lazy } from 'react';
import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { AppShell, type RouteHandle } from '@/components/layout/AppShell';
import { HomePage } from '@/features/home/HomePage';
import { ReadyPage } from '@/features/ready/ReadyPage';
import { DiscoverPage } from '@/features/discover/DiscoverPage';
import { MyPage } from '@/features/my/MyPage';
import { ExperienceDetailPage } from '@/features/experience/ExperienceDetailPage';
import { ExperiencePlayPage } from '@/features/experience/ExperiencePlayPage';
import { ExperienceDonePage } from '@/features/experience/ExperienceDonePage';
import { AccountPage } from '@/features/account/AccountPage';
import { ResetPasswordPage } from '@/features/account/ResetPasswordPage';
import { APP_BASE } from './paths';

// 공식 홈페이지는 따로 불러온다 → 서비스(/app) 코드와 섞이지 않는 별도 chunk
const SitePage = lazy(() => import('@/features/site/SitePage').then((m) => ({ default: m.SitePage })));

/**
 * 6단계까지 쓰던 주소(/my, /discover/…, /account/reset#… 등)를 /app 아래로 옮긴다.
 * 쿼리와 해시를 그대로 넘겨 북마크·이미 보낸 인증/재설정 메일 링크도 계속 동작한다.
 */
function LegacyRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={`${APP_BASE}${pathname}${search}${hash}`} replace />;
}

const LEGACY_PATHS = ['ready', 'discover/*', 'experience/*', 'my', 'account/*'];

/** 라우트 정의. 서비스의 새 기능은 /app children에 경로를 추가한다. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <Suspense fallback={null}>
        <SitePage />
      </Suspense>
    ),
  },
  {
    path: APP_BASE,
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'ready', element: <ReadyPage /> },
      { path: 'discover', element: <DiscoverPage /> },
      { path: 'discover/:categoryId', element: <DiscoverPage /> },
      { path: 'experience/:experienceId', element: <ExperienceDetailPage /> },
      { path: 'experience/:experienceId/play', element: <ExperiencePlayPage />, handle: { immersive: true } satisfies RouteHandle },
      { path: 'experience/:experienceId/done', element: <ExperienceDonePage /> },
      { path: 'my', element: <MyPage /> },
      { path: 'account', element: <AccountPage /> },
      { path: 'account/reset', element: <ResetPasswordPage /> },
      { path: '*', element: <Navigate to={APP_BASE} replace /> },
    ],
  },
  ...LEGACY_PATHS.map((path) => ({ path, element: <LegacyRedirect /> })),
  { path: '*', element: <Navigate to="/" replace /> },
];

export const createAppRouter = () => createBrowserRouter(routes);
