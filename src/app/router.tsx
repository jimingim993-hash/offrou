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
import { InstantPage } from '@/features/now/InstantPage';
import { CoursePage } from '@/features/course/CoursePage';
import { CourseDonePage, CourseNextPage } from '@/features/course/CourseStepPages';
import { APP_BASE } from './paths';
import { MySupportPage, SupportPage } from '@/features/support/SupportPage';
import { AppError } from './AppError';

// 공식 홈페이지는 따로 불러온다 → 서비스(/app) 코드와 섞이지 않는 별도 chunk
const SitePage = lazy(() => import('@/features/site/SitePage').then((m) => ({ default: m.SitePage })));
// 운영자 관리센터도 따로 불러온다 → 일반 사용자 화면 번들에 섞이지 않는다
const AdminApp = lazy(() => import('@/features/admin/AdminApp').then((m) => ({ default: m.AdminApp })));

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
    errorElement: <AppError />,
    element: (
      <Suspense fallback={null}>
        <SitePage />
      </Suspense>
    ),
  },
  {
    path: APP_BASE,
    element: <AppShell />,
    errorElement: <AppError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'ready', element: <ReadyPage /> },
      { path: 'now', element: <InstantPage /> },
      { path: 'course', element: <CoursePage /> },
      { path: 'course/next', element: <CourseNextPage /> },
      { path: 'course/done', element: <CourseDonePage /> },
      { path: 'discover', element: <DiscoverPage /> },
      { path: 'discover/:categoryId', element: <DiscoverPage /> },
      { path: 'experience/:experienceId', element: <ExperienceDetailPage /> },
      { path: 'experience/:experienceId/play', element: <ExperiencePlayPage />, handle: { immersive: true } satisfies RouteHandle },
      { path: 'experience/:experienceId/done', element: <ExperienceDonePage /> },
      { path: 'my', element: <MyPage /> },
      { path: 'account', element: <AccountPage /> },
      { path: 'account/reset', element: <ResetPasswordPage /> },
      { path: 'support', element: <SupportPage /> },
      { path: 'support/mine', element: <MySupportPage /> },
      { path: '*', element: <Navigate to={APP_BASE} replace /> },
    ],
  },
  {
    // 운영자 관리센터 — 권한은 서버(Supabase RLS·is_offrou_admin)가 판단한다. 일반 화면 어디에도 링크하지 않는다.
    path: '/admin/*',
    errorElement: <AppError />,
    element: (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ),
  },
  ...LEGACY_PATHS.map((path) => ({ path, element: <LegacyRedirect /> })),
  { path: '*', element: <Navigate to="/" replace /> },
];

export const createAppRouter = () => createBrowserRouter(routes);
