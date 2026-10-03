import { Navigate, createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { AppShell, type RouteHandle } from '@/components/layout/AppShell';
import { HomePage } from '@/features/home/HomePage';
import { ReadyPage } from '@/features/ready/ReadyPage';
import { DiscoverPage } from '@/features/discover/DiscoverPage';
import { CategoryPage } from '@/features/discover/CategoryPage';
import { MyPage } from '@/features/my/MyPage';
import { ExperienceDetailPage } from '@/features/experience/ExperienceDetailPage';
import { ExperiencePlayPage } from '@/features/experience/ExperiencePlayPage';
import { ExperienceDonePage } from '@/features/experience/ExperienceDonePage';

/** 라우트 정의. 새 기능은 children에 경로를 추가한다. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'ready', element: <ReadyPage /> },
      { path: 'discover', element: <DiscoverPage /> },
      { path: 'discover/:categoryId', element: <CategoryPage /> },
      { path: 'experience/:experienceId', element: <ExperienceDetailPage /> },
      { path: 'experience/:experienceId/play', element: <ExperiencePlayPage />, handle: { immersive: true } satisfies RouteHandle },
      { path: 'experience/:experienceId/done', element: <ExperienceDonePage /> },
      { path: 'my', element: <MyPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const createAppRouter = () => createBrowserRouter(routes);
