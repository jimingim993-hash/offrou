import { Outlet, useLocation, useMatches } from 'react-router-dom';
import { useEffect } from 'react';
import { BottomNav } from './BottomNav';
import { OfflineNotice, UpdateBanner } from './StatusNotices';
import { useTypingFocus } from '@/hooks/useTypingFocus';
import { AccountProvider } from '@/features/account/AccountProvider';
import styles from './AppShell.module.css';

/** 라우트 handle로 몰입형 화면(하단 내비 숨김)을 지정한다 */
export interface RouteHandle {
  immersive?: boolean;
}

export function AppShell() {
  const { pathname, search } = useLocation();
  const immersive = useMatches().some((m) => (m.handle as RouteHandle | undefined)?.immersive);
  const typing = useTypingFocus();
  // 경험·코스를 진행하는 중에는 업데이트 안내로 흐름을 끊지 않는다
  const inProgress = immersive || pathname.includes('/course') || new URLSearchParams(search).has('crun');

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  // 서비스 화면 제목 (공식 홈페이지는 따로 정한다)
  useEffect(() => {
    document.title = 'OFFROU 오프루';
  }, []);

  return (
    <AccountProvider>
      <div className={styles.shell}>
        <main className={`${styles.main} ${immersive ? styles.immersive : ''}`}>
          <OfflineNotice />
          {/* key로 화면 전환 시 가벼운 등장 애니메이션 */}
          <div key={pathname} className={`${styles.page} rise`}>
            <Outlet />
          </div>
        </main>
        {!immersive && <BottomNav typing={typing} />}
        <UpdateBanner hidden={inProgress || typing} withNav={!immersive} />
      </div>
    </AccountProvider>
  );
}
